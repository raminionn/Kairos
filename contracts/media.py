from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def check_repo_path(value: str) -> str:
    """Paths in contracts are relative to the repo root and use forward slashes."""
    if "\\" in value:
        raise ValueError(f"use forward slashes: {value!r}")
    if value.startswith("/") or (len(value) > 1 and value[1] == ":"):
        raise ValueError(f"path must be relative to the repo root: {value!r}")
    return value


class MediaInfo(BaseModel):
    """media.json: what ingestion learned about a video and where its audio track was written."""

    model_config = ConfigDict(extra="forbid")

    video_id: str = Field(min_length=1, pattern=r"^\S+$")
    source_path: str
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    duration: float = Field(gt=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fps: float = Field(gt=0)
    rotation: int = 0
    has_audio: bool
    video_codec: str
    audio_codec: Optional[str] = None
    audio_path: Optional[str] = None
    audio_sample_rate: Optional[int] = None
    audio_channels: Optional[int] = None

    @field_validator("source_path", "audio_path")
    @classmethod
    def _repo_relative(cls, value: Optional[str]) -> Optional[str]:
        return None if value is None else check_repo_path(value)

    @field_validator("rotation")
    @classmethod
    def _right_angle(cls, value: int) -> int:
        if value not in (0, 90, 180, 270):
            raise ValueError("rotation must be 0, 90, 180 or 270")
        return value

    @model_validator(mode="after")
    def _audio_fields_match(self) -> "MediaInfo":
        audio = [self.audio_codec, self.audio_path, self.audio_sample_rate, self.audio_channels]
        if self.has_audio and any(v is None for v in audio):
            raise ValueError("has_audio is true, so all audio fields are required")
        if not self.has_audio and any(v is not None for v in audio):
            raise ValueError("has_audio is false, so audio fields must be null")
        return self
