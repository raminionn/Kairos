"""Speech recognition with faster-whisper: word timestamps, VAD, speech_ratio and asr_confidence.
Results are cached in data/cache/asr/ so the same video with the same settings is transcribed once."""

import argparse
import hashlib
import json
import logging
import os
import time
from dataclasses import asdict
from functools import lru_cache
from importlib.metadata import version
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ValidationError

from contracts import MediaInfo, Segment, Word, load_json
from understanding.config import ASR_CACHE_DIR, REPO_ROOT, ASRSettings, asr_settings_from_env

log = logging.getLogger(__name__)


class ASRResult(BaseModel):
    duration: float
    speech_ratio: float = Field(ge=0, le=1)
    asr_confidence: float = Field(ge=0, le=1)
    words: List[Word] = Field(default_factory=list)
    segments: List[Segment] = Field(default_factory=list)
    debug: Dict[str, Any] = Field(default_factory=dict)  # cache only, never copied into the contract


def cache_key(video_sha256: str, settings: ASRSettings) -> str:
    """Device is left out: CPU and GPU runs of the same model are treated as the same result."""
    parts = asdict(settings)
    parts.pop("device")
    parts["video_sha256"] = video_sha256
    return hashlib.sha256(json.dumps(parts, sort_keys=True).encode()).hexdigest()


def cache_path(key: str) -> Path:
    return ASR_CACHE_DIR / f"{key}.json"


def load_cached(key: str) -> Optional[ASRResult]:
    path = cache_path(key)
    if not path.is_file():
        return None
    try:
        return ASRResult.model_validate(json.loads(path.read_text(encoding="utf-8"))["result"])
    except (ValueError, KeyError, ValidationError):
        log.warning("ignoring unreadable cache file %s", path)
        return None


def save_cached(key: str, video_sha256: str, settings: ASRSettings, result: ASRResult) -> None:
    path = cache_path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"video_sha256": video_sha256, "settings": asdict(settings), "result": result.model_dump()}
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    os.replace(tmp, path)


@lru_cache(maxsize=2)
def load_model(model_size: str, device: str, compute_type: str) -> Any:
    from faster_whisper import WhisperModel

    return WhisperModel(model_size, device=device, compute_type=compute_type)


def clamp(t: float, duration: float) -> float:
    return round(min(max(t, 0.0), duration), 3)


def collect_words(raw_segments: List[Any], duration: float) -> List[Word]:
    words = []
    for seg in raw_segments:
        for w in seg.words or []:
            text = w.word.strip()
            if text:
                start = clamp(w.start, duration)
                words.append(Word(w=text, start=start, end=max(start, clamp(w.end, duration))))
    return sorted(words, key=lambda w: w.start)


def collect_segments(raw_segments: List[Any], duration: float) -> List[Segment]:
    segments = []
    for seg in raw_segments:
        text = seg.text.strip()
        start, end = clamp(seg.start, duration), clamp(seg.end, duration)
        if text and end > start:
            segments.append(Segment(start=start, end=end, text=text, visual=None))
    return sorted(segments, key=lambda s: s.start)


def mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def compute_speech_ratio(info: Any, segments: List[Segment], vad_filter: bool) -> float:
    """With VAD on: share of the audio the VAD kept as speech. Without VAD: share covered by segments."""
    if info.duration <= 0:
        return 0.0
    speech = info.duration_after_vad if vad_filter else sum(s.end - s.start for s in segments)
    return round(min(1.0, speech / info.duration), 3)


def run_whisper(audio_path: Path, settings: ASRSettings) -> ASRResult:
    model = load_model(settings.model_size, settings.device, settings.compute_type)
    raw_iter, info = model.transcribe(
        str(audio_path),
        word_timestamps=True,
        vad_filter=settings.vad_filter,
        beam_size=settings.beam_size,
        language=settings.language,
    )
    raw = list(raw_iter)
    segments = collect_segments(raw, info.duration)
    probabilities = [w.probability for s in raw for w in (s.words or []) if w.word.strip()]
    return ASRResult(
        duration=round(info.duration, 3),
        speech_ratio=compute_speech_ratio(info, segments, settings.vad_filter),
        asr_confidence=round(mean(probabilities), 3),
        words=collect_words(raw, info.duration),
        segments=segments,
        debug={
            "mean_avg_logprob": round(mean([s.avg_logprob for s in raw]), 4),
            "mean_no_speech_prob": round(mean([s.no_speech_prob for s in raw]), 4),
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "faster_whisper_version": version("faster-whisper"),
        },
    )


def empty_result(duration: float) -> ASRResult:
    return ASRResult(duration=duration, speech_ratio=0.0, asr_confidence=0.0, debug={"reason": "no audio"})


def transcribe(media: MediaInfo, settings: Optional[ASRSettings] = None, use_cache: bool = True) -> ASRResult:
    settings = settings or asr_settings_from_env()
    if not media.has_audio or media.audio_path is None:
        return empty_result(media.duration)
    key = cache_key(media.sha256, settings)
    if use_cache:
        cached = load_cached(key)
        if cached is not None:
            log.info("ASR cache hit for %s", media.video_id)
            return cached
    log.info("transcribing %s with whisper %s on %s", media.video_id, settings.model_size, settings.device)
    result = run_whisper(REPO_ROOT / media.audio_path, settings)
    save_cached(key, media.sha256, settings, result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Transcribe a video from its media.json.")
    parser.add_argument("media_json", type=Path)
    parser.add_argument("--no-cache", action="store_true", help="ignore and overwrite the cached result")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    media = load_json(MediaInfo, args.media_json)
    started = time.time()
    result = transcribe(media, use_cache=not args.no_cache)
    print(f"video_id       {media.video_id}")
    print(f"duration       {result.duration:.1f} s")
    print(f"speech_ratio   {result.speech_ratio:.3f}")
    print(f"asr_confidence {result.asr_confidence:.3f}")
    print(f"words          {len(result.words)}")
    print(f"segments       {len(result.segments)}")
    print(f"language       {result.debug.get('language')}")
    print(f"took           {time.time() - started:.1f} s")
    for seg in result.segments[:3]:
        print(f"  [{seg.start:6.1f}-{seg.end:6.1f}] {seg.text}")


if __name__ == "__main__":
    main()
