"""Command line entry point: one video in, understanding.json out.

    python -m understanding.run data/videos/x.mp4 [--id my_id] [--out some/folder]

Runs ingest, ASR, the router, the vision path (vision/both routes) and the genre classifier,
then writes data/work/<video_id>/understanding.json. While the vision path or the genre
classifier is still a stub, a STUB line is printed for it.
"""

import argparse
from pathlib import Path
from typing import List, Optional

from contracts import MediaInfo, Segment, Understanding, Word, save_json
from understanding.asr import ASRResult, transcribe
from understanding.config import REPO_ROOT, WORK_DIR
from understanding.genre import GenreResult, classify_genre
from understanding.ingest import ingest
from understanding.router import RouteDecision, choose_route, words_per_minute
from understanding.vision import VisionResult, describe_video, merge_segments


def segments_for_route(route: str, asr: ASRResult, vision: Optional[VisionResult]) -> List[Segment]:
    visual = vision.segments if vision is not None else []
    if route == "vision":
        return visual
    if route == "both":
        return merge_segments(asr.segments, visual)
    return asr.segments


def words_for_route(route: str, asr: ASRResult) -> List[Word]:
    return [] if route == "vision" else asr.words


def build_understanding(
    media: MediaInfo,
    asr: ASRResult,
    decision: RouteDecision,
    segments: List[Segment],
    genre: GenreResult,
) -> Understanding:
    data = {
        "video_id": media.video_id,
        "duration": media.duration,
        "route": decision.route,
        "speech_ratio": asr.speech_ratio,
        "asr_confidence": asr.asr_confidence,
        "genre": genre.genre,
        "genre_confidence": genre.confidence,
        "words": [w.model_dump() for w in words_for_route(decision.route, asr)],
        "segments": [s.model_dump() for s in segments],
    }
    return Understanding.model_validate(data)


def stub_notes(route: str, vision: Optional[VisionResult], genre: GenreResult) -> List[str]:
    notes = []
    if vision is not None and vision.is_stub:
        if route == "vision":
            notes.append("vision path not built yet: segments are empty")
        else:
            notes.append("vision path not built yet: segments have text only")
    if genre.is_stub:
        notes.append("genre classifier not built yet: genre is 'unknown'")
    return notes


def run(video: Path, video_id: Optional[str] = None, out_dir: Optional[Path] = None) -> Path:
    media = ingest(video, video_id)
    asr = transcribe(media)
    wpm = words_per_minute(len(asr.words), media.duration)
    decision = choose_route(asr.speech_ratio, asr.asr_confidence, wpm)
    vision = describe_video(media) if decision.route in ("vision", "both") else None
    segments = segments_for_route(decision.route, asr, vision)
    genre = classify_genre(segments, media.duration)
    understanding = build_understanding(media, asr, decision, segments, genre)

    out_path = Path(out_dir or WORK_DIR / media.video_id) / "understanding.json"
    save_json(understanding, out_path)

    print(f"video_id  {media.video_id}")
    print(f"route     {decision.route} ({decision.reason})")
    print(f"metrics   speech_ratio {asr.speech_ratio:.3f}, asr_confidence {asr.asr_confidence:.3f}, {wpm:.0f} wpm")
    print(f"content   {len(understanding.words)} words, {len(understanding.segments)} segments")
    print(f"genre     {genre.genre} ({genre.confidence:.2f})")
    for note in stub_notes(decision.route, vision, genre):
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
