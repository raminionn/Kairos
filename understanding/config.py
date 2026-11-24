import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
VIDEOS_DIR = REPO_ROOT / "data" / "videos"
WORK_DIR = REPO_ROOT / "data" / "work"
CACHE_DIR = REPO_ROOT / "data" / "cache"
ASR_CACHE_DIR = CACHE_DIR / "asr"

AUDIO_SAMPLE_RATE = 16000
AUDIO_CHANNELS = 1

load_dotenv(REPO_ROOT / ".env")


@dataclass(frozen=True)
class RouterThresholds:
    """Placeholder values, to be tuned from the labelled test videos (see eval/route_report.py)."""

    # vision if there is almost no speech or almost no words
    vision_max_speech_ratio: float = 0.2
    vision_max_words: int = 30
    # transcript only if speech is plentiful, clearly recognised and long enough
    transcript_min_speech_ratio: float = 0.5
    transcript_min_confidence: float = 0.6
    transcript_min_words: int = 150


ROUTER = RouterThresholds()


@dataclass(frozen=True)
class ASRSettings:
    model_size: str = "small"
    device: str = "cpu"
    compute_type: str = "int8"
    vad_filter: bool = True
    beam_size: int = 5
    language: Optional[str] = None  # None lets Whisper detect the language


def asr_settings_from_env() -> ASRSettings:
    """Defaults above, overridable from .env (e.g. KAIROS_ASR_MODEL=medium, KAIROS_ASR_DEVICE=cuda)."""
    d = ASRSettings()
    return ASRSettings(
        model_size=os.getenv("KAIROS_ASR_MODEL") or d.model_size,
        device=os.getenv("KAIROS_ASR_DEVICE") or d.device,
        compute_type=os.getenv("KAIROS_ASR_COMPUTE_TYPE") or d.compute_type,
        vad_filter=(os.getenv("KAIROS_ASR_VAD") or str(d.vad_filter)).lower() in ("1", "true", "yes"),
        beam_size=int(os.getenv("KAIROS_ASR_BEAM_SIZE") or d.beam_size),
        language=os.getenv("KAIROS_ASR_LANGUAGE") or d.language,
    )
