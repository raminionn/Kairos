import sys

from contracts import MediaInfo, Segment, Word
from understanding.asr import ASRResult
from understanding.genre import GenreResult
from understanding.router import RouteDecision
from understanding.run import build_understanding, segments_for_route, stub_notes
from understanding.vision import VisionResult

MEDIA = MediaInfo(
    video_id="t1", source_path="data/videos/t1.mp4", sha256="0" * 64, duration=10.0,
    width=640, height=360, fps=25.0, has_audio=True, video_codec="h264", audio_codec="aac",
    audio_path="data/work/t1/audio.wav", audio_sample_rate=16000, audio_channels=1,
)
ASR = ASRResult(
    duration=10.0, speech_ratio=0.9, asr_confidence=0.9,
    words=[Word(w="hi", start=1.0, end=1.4)],
    segments=[Segment(start=1.0, end=1.4, text="hi")],
)
VISION = VisionResult([Segment(start=0.0, end=10.0, visual="a cat")])
GENRE = GenreResult("talk", 0.8)


def build(route, vision=None):
    segments = segments_for_route(route, ASR, vision)
    return build_understanding(MEDIA, ASR, RouteDecision(route, "test"), segments, GENRE)


def test_transcript_route_keeps_words_and_text():
    u = build("transcript")
    assert len(u.words) == 1 and u.segments[0].text == "hi" and u.genre == "talk"


def test_vision_route_drops_words_and_uses_visuals():
    u = build("vision", VISION)
    assert u.words == [] and [(s.text, s.visual) for s in u.segments] == [(None, "a cat")]


def test_vision_route_with_stub_is_still_valid():
    u = build("vision", VisionResult(is_stub=True))
    assert u.words == [] and u.segments == []


def test_both_route_merges():
    u = build("both", VISION)
    assert [(s.text, s.visual) for s in u.segments] == [("hi", "a cat")]


def test_whisper_is_not_loaded_by_these_tests():
    assert "faster_whisper" not in sys.modules


def test_stub_notes_only_for_stubs():
    assert stub_notes("both", VISION, GENRE) == []
    assert len(stub_notes("both", VisionResult(is_stub=True), GenreResult("unknown", 0.0, is_stub=True))) == 2
    assert len(stub_notes("transcript", None, GenreResult("unknown", 0.0, is_stub=True))) == 1
