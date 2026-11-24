"""Command line entry point: one video in, understanding.json out.

    python -m understanding.run data/videos/x.mp4 [--id my_id] [--out some/folder]

Runs ingest, ASR and the router, then writes data/work/<video_id>/understanding.json.
Not built yet: the vision path (no visual descriptions) and the genre classifier (genre "unknown").
"""

import argparse
from pathlib import Path
from typing import List, Optional

from contracts import UNKNOWN_GENRE, MediaInfo, Segment, Understanding, Word, save_json
from understanding.asr import ASRResult, transcribe
from understanding.config import REPO_ROOT, WORK_DIR
from understanding.ingest import ingest
from understanding.router import RouteDecision, choose_route, words_per_minute

# Placeholders until the genre classifier exists.
STUB_GENRE = UNKNOWN_GENRE
STUB_GENRE_CONFIDENCE = 0.0


def segments_for_route(route: str, asr: ASRResult) -> List[Segment]:
    """Vision descriptions are not built yet, so the vision route has no segments
    and the both route only carries transcript text for now."""
    return [] if route == "vision" else asr.segments


def words_for_route(route: str, asr: ASRResult) -> List[Word]:
    return [] if route == "vision" else asr.words


def build_understanding(media: MediaInfo, asr: ASRResult, decision: RouteDecision) -> Understanding:
    data = {
        "video_id": media.video_id,
        "duration": media.duration,
        "route": decision.route,
        "speech_ratio": asr.speech_ratio,
        "asr_confidence": asr.asr_confidence,
        "genre": STUB_GENRE,
        "genre_confidence": STUB_GENRE_CONFIDENCE,
        "words": [w.model_dump() for w in words_for_route(decision.route, asr)],
        "segments": [s.model_dump() for s in segments_for_route(decision.route, asr)],
    }
    return Understanding.model_validate(data)


def stub_notes(understanding: Understanding) -> List[str]:
    notes = ["genre is 'unknown' (genre classifier not built yet)"]
    if understanding.route == "vision":
        notes.append("route is vision but the vision path is not built yet: segments are empty")
    elif understanding.route == "both":
        notes.append("route is both but the vision path is not built yet: segments have text only")
    return notes


def run(video: Path, video_id: Optional[str] = None, out_dir: Optional[Path] = None) -> Path:
    media = ingest(video, video_id)
    asr = transcribe(media)
    wpm = words_per_minute(len(asr.words), media.duration)
    decision = choose_route(asr.speech_ratio, asr.asr_confidence, wpm)
    understanding = build_understanding(media, asr, decision)

    out_path = Path(out_dir or WORK_DIR / media.video_id) / "understanding.json"
    save_json(understanding, out_path)

    print(f"video_id  {media.video_id}")
    print(f"route     {decision.route} ({decision.reason})")
    print(f"metrics   speech_ratio {asr.speech_ratio:.3f}, asr_confidence {asr.asr_confidence:.3f}, {wpm:.0f} wpm")
    print(f"content   {len(understanding.words)} words, {len(understanding.segments)} segments")
    for note in stub_notes(understanding):
        print(f"STUB      {note}")
    print(f"wrote     {display_path(out_path)}")
    return out_path


def display_path(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return str(path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Video in, understanding.json out.")
    parser.add_argument("video", type=Path)
    parser.add_argument("--id", dest="video_id", default=None, help="override the video id")
    parser.add_argument("--out", type=Path, default=None, help="output folder (default data/work/<video_id>)")
    args = parser.parse_args()
    run(args.video, args.video_id, args.out)


if __name__ == "__main__":
    main()
