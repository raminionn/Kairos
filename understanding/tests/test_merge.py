from pathlib import Path

from contracts import Segment, Understanding
from understanding.vision import Frame, frames_to_segments, merge_segments


def text(start, end, t):
    return Segment(start=start, end=end, text=t)


def visual(start, end, v):
    return Segment(start=start, end=end, visual=v)


def test_no_visuals_leaves_text_unchanged():
    segs = [text(0, 5, "hi")]
    assert merge_segments(segs, []) == segs


def test_text_takes_the_visual_it_overlaps_most():
    merged = merge_segments([text(8, 14, "hi")], [visual(0, 10, "A"), visual(10, 20, "B")])
    assert [(s.text, s.visual) for s in merged] == [("hi", "B")]


def test_silent_stretch_becomes_visual_only_segment():
    merged = merge_segments(
        [text(0, 5, "hi"), text(30, 35, "bye")],
        [visual(0, 10, "A"), visual(10, 28, "B"), visual(28, 40, "C")],
    )
    assert [(s.start, s.text, s.visual) for s in merged] == [(0, "hi", "A"), (10, None, "B"), (30, "bye", "C")]


def test_touching_segments_do_not_count_as_overlap():
    merged = merge_segments([text(0, 10, "hi")], [visual(10, 20, "A")])
    assert [(s.text, s.visual) for s in merged] == [("hi", None), (None, "A")]


def test_merged_segments_are_valid_on_the_both_route():
    merged = merge_segments([text(1, 4, "hi")], [visual(0, 3, "A"), visual(5, 9, "B")])
    u = Understanding(video_id="t1", duration=10.0, route="both", speech_ratio=0.4,
                      asr_confidence=0.8, segments=merged)
    assert len(u.segments) == 2


def test_frames_to_segments():
    frames = [Frame(0.0, Path("a.jpg")), Frame(5.0, Path("b.jpg")), Frame(10.0, Path("c.jpg"))]
    segs = frames_to_segments(frames, ["A", "B", "C"], duration=12.0)
    assert [(s.start, s.end, s.text, s.visual) for s in segs] == [
        (0.0, 5.0, None, "A"), (5.0, 10.0, None, "B"), (10.0, 12.0, None, "C")]


def test_frame_at_the_very_end_is_dropped():
    frames = [Frame(0.0, Path("a.jpg")), Frame(12.0, Path("b.jpg"))]
    assert len(frames_to_segments(frames, ["A", "B"], duration=12.0)) == 1
