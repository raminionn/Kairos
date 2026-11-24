"""Vision path: sample frames from the video and describe them with a hosted VLM through OpenRouter.

STUB: describe_video returns no segments and is_stub=True. To build the real version, implement
sample_frames and describe_frame, then make describe_video return is_stub=False.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from contracts import MediaInfo, Segment
from understanding.config import VISION, VisionSettings


@dataclass(frozen=True)
class Frame:
    time: float  # seconds from the start of the video
    path: Path  # extracted image file


@dataclass(frozen=True)
class VisionResult:
    segments: List[Segment] = field(default_factory=list)  # text=None, visual=description
    is_stub: bool = False


def sample_frames(media: MediaInfo, settings: VisionSettings = VISION, out_dir: Optional[Path] = None) -> List[Frame]:
    """Extract one frame every settings.frame_interval_s seconds (at most settings.max_frames)
    with FFmpeg into data/work/<video_id>/frames/, honouring media.rotation."""
    raise NotImplementedError("frame sampling is not built yet")


def describe_frame(frame: Frame, settings: VisionSettings = VISION) -> str:
    """Send one frame to settings.model through OpenRouter (key from OPENROUTER_API_KEY in .env)
    and return a one-sentence description of what is on screen."""
    raise NotImplementedError("the VLM call is not built yet")


def frames_to_segments(frames: List[Frame], descriptions: List[str], duration: float) -> List[Segment]:
    """Each description covers from its frame's time until the next frame (the last one until the end)."""
    ends = [f.time for f in frames[1:]] + [duration]
    return [
        Segment(start=f.time, end=end, text=None, visual=d)
        for f, end, d in zip(frames, ends, descriptions)
        if end > f.time
    ]


def describe_video(media: MediaInfo, settings: VisionSettings = VISION) -> VisionResult:
    """Real version:
        frames = sample_frames(media, settings)
        descriptions = [describe_frame(f, settings) for f in frames]
        return VisionResult(frames_to_segments(frames, descriptions, media.duration), is_stub=False)
    """
    return VisionResult(segments=[], is_stub=True)


def overlap(a: Segment, b: Segment) -> float:
    return max(0.0, min(a.end, b.end) - max(a.start, b.start))


def merge_segments(text_segments: List[Segment], visual_segments: List[Segment]) -> List[Segment]:
    """For the "both" route: each text segment takes the visual description it overlaps most;
    visual segments that overlap no speech are kept as visual-only segments."""
    merged = []
    for t in text_segments:
        best = max(visual_segments, key=lambda v: overlap(t, v), default=None)
        visual = best.visual if best is not None and overlap(t, best) > 0 else None
        merged.append(t.model_copy(update={"visual": visual}))
    for v in visual_segments:
        if not any(overlap(v, t) > 0 for t in text_segments):
            merged.append(v)
    return sorted(merged, key=lambda s: s.start)
