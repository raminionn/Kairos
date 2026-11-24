"""Decide which analysis path a video goes down, from how much usable speech it has.

- "vision": almost no speech or almost no words; describe the frames with a VLM instead.
- "transcript": plenty of clearly recognised speech; the transcript alone describes the video.
- "both": anything in between. Both paths run and their output is merged into the same
  segments, so a segment can carry text (what is said) and visual (what is shown) together.
"""

import argparse
from dataclasses import dataclass
from pathlib import Path

from contracts import MediaInfo, Route, load_json
from understanding.config import ROUTER, RouterThresholds


@dataclass(frozen=True)
class RouteDecision:
    route: Route
    reason: str


def choose_route(
    speech_ratio: float,
    asr_confidence: float,
    word_count: int,
    thresholds: RouterThresholds = ROUTER,
) -> RouteDecision:
    if not 0.0 <= speech_ratio <= 1.0 or not 0.0 <= asr_confidence <= 1.0 or word_count < 0:
        raise ValueError("speech_ratio and asr_confidence must be in [0, 1] and word_count >= 0")
    t = thresholds
    if speech_ratio < t.vision_max_speech_ratio:
        return RouteDecision("vision", f"speech_ratio {speech_ratio:.2f} < {t.vision_max_speech_ratio}")
    if word_count < t.vision_max_words:
        return RouteDecision("vision", f"{word_count} words < {t.vision_max_words}")
    weak = []
    if speech_ratio < t.transcript_min_speech_ratio:
        weak.append(f"speech_ratio {speech_ratio:.2f} < {t.transcript_min_speech_ratio}")
    if asr_confidence < t.transcript_min_confidence:
        weak.append(f"asr_confidence {asr_confidence:.2f} < {t.transcript_min_confidence}")
    if word_count < t.transcript_min_words:
        weak.append(f"{word_count} words < {t.transcript_min_words}")
    if weak:
        return RouteDecision("both", "; ".join(weak))
    return RouteDecision("transcript", "enough clear speech")


def main() -> None:
    from understanding.asr import transcribe

    parser = argparse.ArgumentParser(description="Show the route chosen for an ingested video.")
    parser.add_argument("media_json", type=Path)
    args = parser.parse_args()
    media = load_json(MediaInfo, args.media_json)
    result = transcribe(media)
    decision = choose_route(result.speech_ratio, result.asr_confidence, len(result.words))
    print(f"{media.video_id}: speech_ratio {result.speech_ratio:.3f}, asr_confidence "
          f"{result.asr_confidence:.3f}, words {len(result.words)} -> {decision.route} ({decision.reason})")


if __name__ == "__main__":
    main()
