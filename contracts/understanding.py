from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from contracts.genres import UNKNOWN_GENRE, check_genre

Route = Literal["transcript", "vision", "both"]

# Whisper word and segment end times can run slightly past the real end of the file.
DURATION_TOLERANCE = 1.0


class Word(BaseModel):
    model_config = ConfigDict(extra="forbid")

    w: str
    start: float = Field(ge=0)
    end: float = Field(ge=0)

    @model_validator(mode="after")
    def _ordered(self) -> "Word":
        if self.end < self.start:
            raise ValueError(f"word {self.w!r} ends before it starts")
        return self


class Segment(BaseModel):
    """One time-aligned piece of the video: what is said (text), what is shown (visual), or both."""

    model_config = ConfigDict(extra="forbid")

    start: float = Field(ge=0)
    end: float = Field(ge=0)
    text: Optional[str] = None
    visual: Optional[str] = None

    @model_validator(mode="after")
    def _valid(self) -> "Segment":
        if self.end <= self.start:
            raise ValueError(f"segment {self.start}-{self.end} must end after it starts")
        if self.text is None and self.visual is None:
            raise ValueError("segment needs text, visual or both")
        return self


class Understanding(BaseModel):
    """understanding.json: the time-aligned description of a video passed to the Decision layer.

    route says which analysis path produced the segments:
    - "transcript": speech is usable; segments carry text, visual is null.
    - "vision": too little usable speech; words is empty, text is null, visual describes the screen.
    - "both": both paths ran and their results are merged into the same segments, so a
      segment may carry text and visual together.
    """

    model_config = ConfigDict(extra="forbid")

    video_id: str = Field(min_length=1, pattern=r"^\S+$")
    duration: float = Field(gt=0)
    route: Route
    speech_ratio: float = Field(ge=0, le=1)
    asr_confidence: float = Field(ge=0, le=1)
    genre: str = UNKNOWN_GENRE
    genre_confidence: float = Field(default=0.0, ge=0, le=1)
    words: List[Word] = Field(default_factory=list)
    segments: List[Segment] = Field(default_factory=list)

    @field_validator("genre")
    @classmethod
    def _known_genre(cls, value: str) -> str:
        return check_genre(value)

    @model_validator(mode="after")
    def _route_rules(self) -> "Understanding":
        if self.route == "transcript":
            if any(s.text is None or s.visual is not None for s in self.segments):
                raise ValueError("transcript route: every segment needs text and no visual")
        if self.route == "vision":
            if self.words:
                raise ValueError("vision route: words must be empty")
            if any(s.text is not None for s in self.segments):
                raise ValueError("vision route: segment text must be null")
        return self

    @model_validator(mode="after")
    def _timing(self) -> "Understanding":
        limit = self.duration + DURATION_TOLERANCE
        for name, items in (("words", self.words), ("segments", self.segments)):
            starts = [i.start for i in items]
            if starts != sorted(starts):
                raise ValueError(f"{name} must be sorted by start time")
            if any(i.end > limit for i in items):
                raise ValueError(f"{name} run past the video duration")
        return self
