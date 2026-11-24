"""Ingestion: read a video's metadata with ffprobe, extract a 16 kHz mono wav with FFmpeg,
and write media.json to data/work/<video_id>/."""

import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional

from contracts import MediaInfo, save_json
from understanding.config import AUDIO_CHANNELS, AUDIO_SAMPLE_RATE, REPO_ROOT, WORK_DIR

CHUNK_SIZE = 1024 * 1024


def require_tool(name: str) -> str:
    path = shutil.which(name)
    if path is None:
        raise RuntimeError(f"{name} not found on PATH. Install it with: winget install Gyan.FFmpeg")
    return path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def make_video_id(path: Path, override: Optional[str] = None) -> str:
    raw = override if override else path.stem
    return raw.strip().lower().replace(" ", "_")


def repo_relative(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        raise ValueError(f"{path} is outside the repo; put videos under data/videos") from None


def probe(path: Path) -> Dict[str, Any]:
    cmd = [require_tool("ffprobe"), "-v", "error", "-print_format", "json",
           "-show_format", "-show_streams", str(path)]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def first_stream(streams: List[Dict[str, Any]], kind: str) -> Optional[Dict[str, Any]]:
    return next((s for s in streams if s.get("codec_type") == kind), None)


def parse_fps(stream: Dict[str, Any]) -> float:
    for key in ("avg_frame_rate", "r_frame_rate"):
        num, _, den = stream.get(key, "0/0").partition("/")
        if den and float(den) > 0 and float(num) > 0:
            return round(float(num) / float(den), 3)
    raise ValueError("could not read the frame rate")


def parse_rotation(stream: Dict[str, Any]) -> int:
    """Clockwise degrees to turn the frame to show it upright (same meaning as the phone 'rotate' tag).
    ffprobe's display matrix 'rotation' is counter-clockwise, so its sign is flipped."""
    clockwise = 0.0
    for side in stream.get("side_data_list", []):
        if "rotation" in side:
            clockwise = -float(side["rotation"])
    if "rotate" in stream.get("tags", {}):
        clockwise = float(stream["tags"]["rotate"])
    return int(round(clockwise / 90.0)) * 90 % 360


def parse_duration(info: Dict[str, Any], video: Dict[str, Any]) -> float:
    value = info.get("format", {}).get("duration") or video.get("duration")
    if value is None:
        raise ValueError("could not read the duration")
    return round(float(value), 3)


def extract_audio(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = [require_tool("ffmpeg"), "-y", "-v", "error", "-i", str(src), "-vn",
           "-ac", str(AUDIO_CHANNELS), "-ar", str(AUDIO_SAMPLE_RATE), "-c:a", "pcm_s16le", str(dst)]
    subprocess.run(cmd, capture_output=True, text=True, check=True)


def ingest(video_path: Path, video_id: Optional[str] = None, work_dir: Path = WORK_DIR) -> MediaInfo:
    video_path = Path(video_path)
    if not video_path.is_file():
        raise FileNotFoundError(video_path)
    vid = make_video_id(video_path, video_id)
    out_dir = Path(work_dir) / vid

    info = probe(video_path)
    video = first_stream(info["streams"], "video")
    if video is None:
        raise ValueError(f"{video_path} has no video stream")
    audio = first_stream(info["streams"], "audio")

    audio_path = None
    if audio is not None:
        audio_path = out_dir / "audio.wav"
        extract_audio(video_path, audio_path)

    media = MediaInfo(
        video_id=vid,
        source_path=repo_relative(video_path),
        sha256=sha256_file(video_path),
        duration=parse_duration(info, video),
        width=int(video["width"]),
        height=int(video["height"]),
        fps=parse_fps(video),
        rotation=parse_rotation(video),
        has_audio=audio is not None,
        video_codec=video.get("codec_name", "unknown"),
        audio_codec=audio.get("codec_name", "unknown") if audio else None,
        audio_path=repo_relative(audio_path) if audio_path else None,
        audio_sample_rate=AUDIO_SAMPLE_RATE if audio else None,
        audio_channels=AUDIO_CHANNELS if audio else None,
    )
    save_json(media, out_dir / "media.json")
    return media


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract audio and metadata from a video.")
    parser.add_argument("video", type=Path)
    parser.add_argument("--id", dest="video_id", default=None, help="override the video id")
    args = parser.parse_args()
    media = ingest(args.video, args.video_id)
    print(f"wrote {WORK_DIR.relative_to(REPO_ROOT).as_posix()}/{media.video_id}/media.json")


if __name__ == "__main__":
    main()
