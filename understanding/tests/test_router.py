import pytest

from understanding.config import RouterThresholds
from understanding.router import choose_route, words_per_minute

# Fixed here so that tuning understanding/config.py does not break the tests.
T = RouterThresholds(
    vision_max_speech_ratio=0.2,
    vision_max_wpm=40.0,
    transcript_min_speech_ratio=0.5,
    transcript_min_confidence=0.6,
    transcript_min_wpm=120.0,
)


def route(speech_ratio, confidence, wpm, thresholds=T):
    return choose_route(speech_ratio, confidence, wpm, thresholds).route


def test_words_per_minute():
    assert words_per_minute(168, 48.0) == 210.0
    assert words_per_minute(10, 0.0) == 0.0


@pytest.mark.parametrize("speech_ratio,confidence,wpm,expected", [
    (0.90, 0.90, 200, "transcript"),
    (0.10, 0.90, 200, "vision"),     # almost no speech
    (0.90, 0.90, 20, "vision"),      # music with a few words
    (0.00, 0.00, 0, "vision"),
    (0.35, 0.90, 200, "both"),       # speech ratio in between
    (0.90, 0.40, 200, "both"),       # poorly recognised speech
    (0.90, 0.90, 99, "both"),        # sparse voiceover
    (0.50, 0.60, 120, "transcript"), # exactly on every threshold passes
    (0.20, 0.90, 40, "both"),        # exactly on the vision thresholds is not vision
])
def test_routes(speech_ratio, confidence, wpm, expected):
    assert route(speech_ratio, confidence, wpm) == expected


@pytest.mark.parametrize("speech_ratio,confidence,words,duration,expected", [
    (1.000, 0.925, 168, 48.0, "transcript"),  # podcast_test
    (0.998, 0.918, 173, 47.2, "transcript"),  # duck_cooking_short
    (0.955, 0.895, 99, 60.1, "both"),         # nike_ad
])
def test_numbers_from_the_three_test_videos(speech_ratio, confidence, words, duration, expected):
    assert route(speech_ratio, confidence, words_per_minute(words, duration)) == expected


def test_reason_names_every_weak_signal():
    reason = choose_route(0.3, 0.4, 80, T).reason
    assert "speech_ratio" in reason and "asr_confidence" in reason and "wpm" in reason


def test_thresholds_are_used():
    strict = RouterThresholds(transcript_min_wpm=250.0)
    assert route(0.9, 0.9, 200, strict) == "both"


@pytest.mark.parametrize("args", [(1.2, 0.5, 100), (0.5, -0.1, 100), (0.5, 0.5, -1)])
def test_invalid_inputs_raise(args):
    with pytest.raises(ValueError):
        choose_route(*args, T)
