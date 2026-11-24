"""Run ingest, ASR and the router on every video in data/videos and write a CSV table,
to compare the chosen routes with hand labels and tune the thresholds in understanding/config.py."""

import argparse
import csv
from pathlib import Path
from typing import Dict, List, Union

from understanding.asr import transcribe
from understanding.config import REPO_ROOT, VIDEOS_DIR
from understanding.ingest import ingest
from understanding.router import choose_route, words_per_minute

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"}
COLUMNS = ["video_id", "duration", "speech_ratio", "asr_confidence", "words", "words_per_min", "route"]
DEFAULT_OUT = REPO_ROOT / "scratch" / "route_report.csv"

Row = Dict[str, Union[str, float, int]]


def find_videos(folder: Path) -> List[Path]:
    return sorted(p for p in folder.iterdir() if p.suffix.lower() in VIDEO_EXTENSIONS)


def report_row(video: Path) -> Row:
    media = ingest(video)
    result = transcribe(media)
    wpm = words_per_minute(len(result.words), media.duration)
    decision = choose_route(result.speech_ratio, result.asr_confidence, wpm)
    return {
        "video_id": media.video_id,
        "duration": round(media.duration, 1),
        "speech_ratio": result.speech_ratio,
        "asr_confidence": result.asr_confidence,
        "words": len(result.words),
        "words_per_min": wpm,
        "route": decision.route,
    }


def write_csv(rows: List[Row], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def print_table(rows: List[Row]) -> None:
    widths = {c: max(len(c), *(len(str(r[c])) for r in rows)) for c in COLUMNS}
    print("  ".join(c.ljust(widths[c]) for c in COLUMNS))
    print("  ".join("-" * widths[c] for c in COLUMNS))
    for r in rows:
        print("  ".join(str(r[c]).ljust(widths[c]) for c in COLUMNS))


def main() -> None:
    parser = argparse.ArgumentParser(description="Route report over a folder of videos.")
    parser.add_argument("--videos", type=Path, default=VIDEOS_DIR)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    rows = []
    for video in find_videos(args.videos):
        print(f"processing {video.name} ...", flush=True)
        try:
            rows.append(report_row(video))
        except Exception as e:  # one bad video should not stop the report
            print(f"  skipped {video.name}: {e}")
    if not rows:
        print(f"no videos processed in {args.videos}")
        return
    write_csv(rows, args.out)
    print()
    print_table(rows)
    print(f"\nwrote {args.out}")


if __name__ == "__main__":
    main()
