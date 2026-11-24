"""Genre classifier: ask an LLM (through OpenRouter) which genre a video is, from its segments.

STUB: classify_genre returns "unknown" with confidence 0 and is_stub=True. To build the real
version, implement build_prompt, call_llm and parse_response, then make classify_genre use them.
The allowed genres always come from contracts/genres.py.
"""

from dataclasses import dataclass
from typing import List, Sequence

from contracts import GENRES, UNKNOWN_GENRE, Segment
from contracts.genres import check_genre
from understanding.config import GENRE, GenreSettings


@dataclass(frozen=True)
class GenreResult:
    genre: str
    confidence: float
    is_stub: bool = False

    def __post_init__(self) -> None:
        check_genre(self.genre)
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be in [0, 1]")


def build_prompt(
    segments: List[Segment],
    duration: float,
    genres: Sequence[str] = GENRES,
    settings: GenreSettings = GENRE,
) -> str:
    """Describe the video (transcript text and/or visual descriptions, cut to settings.max_prompt_chars),
    list the allowed genres, and ask for JSON: {"genre": "<one of genres>", "confidence": 0.0-1.0}."""
    raise NotImplementedError("the genre prompt is not built yet")


def call_llm(prompt: str, settings: GenreSettings = GENRE) -> str:
    """Send the prompt to settings.model through OpenRouter (key from OPENROUTER_API_KEY in .env)
    and return the raw text reply."""
    raise NotImplementedError("the LLM call is not built yet")


def parse_response(raw: str) -> GenreResult:
    """Read the JSON reply into a GenreResult. A genre outside contracts/genres.py must be rejected."""
    raise NotImplementedError("response parsing is not built yet")


def classify_genre(segments: List[Segment], duration: float, settings: GenreSettings = GENRE) -> GenreResult:
    """Real version:
        return parse_response(call_llm(build_prompt(segments, duration, settings=settings), settings))
    """
    return GenreResult(genre=UNKNOWN_GENRE, confidence=0.0, is_stub=True)
