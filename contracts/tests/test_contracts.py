import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from contracts import MediaInfo, Understanding, load_json, save_json

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"


def media_data(**changes):
    data = json.loads((FIXTURES / "fake_media.json").read_text(encoding="utf-8"))
    data.update(changes)
    return data


def understanding_data(route_name="transcript", **changes):
    data = {
        "video_id": "t1",
        "duration": 20.0,
        "route": route_name,
        "speech_ratio": 0.8,
        "asr_confidence": 0.9,
        "words": [{"w": "hi", "start": 0.5, "end": 0.8}],
        "segments": [{"start": 0.5, "end": 0.8, "text": "hi", "visual": None}],
    }
    data.update(changes)
    return data


# --- fixtures and round trip

@pytest.mark.parametrize("name", ["fake_understanding_transcript.json", "fake_understanding_vision.json"])
def test_understanding_fixtures_load(name):
    assert load_json(Understanding, FIXTURES / name).video_id.startswith("fake_")


def test_media_fixture_loads():
    assert load_json(MediaInfo, FIXTURES / "fake_media.json").has_audio


def test_save_and_load_round_trip(tmp_path):
    original = Understanding.model_validate(understanding_data())
    path = save_json(original, tmp_path / "sub" / "understanding.json")
    assert load_json(Understanding, path) == original


# --- media.json

@pytest.mark.parametrize("path", ["data\\videos\\x.mp4", "/data/videos/x.mp4", "C:/videos/x.mp4"])
def test_media_rejects_non_repo_paths(path):
    with pytest.raises(ValidationError):
        MediaInfo.model_validate(media_data(source_path=path))


@pytest.mark.parametrize("changes", [
    {"sha256": "abc"},
    {"rotation": 45},
    {"duration": 0},
    {"has_audio": False},
    {"audio_path": None},
    {"extra_field": 1},
])
def test_media_rejects_bad_values(changes):
    with pytest.raises(ValidationError):
        MediaInfo.model_validate(media_data(**changes))


def test_media_without_audio():
    silent = media_data(has_audio=False, audio_codec=None, audio_path=None,
                        audio_sample_rate=None, audio_channels=None)
    assert not MediaInfo.model_validate(silent).has_audio


# --- understanding.json

def test_genre_defaults_to_unknown():
    u = Understanding.model_validate(understanding_data())
    assert (u.genre, u.genre_confidence) == ("unknown", 0.0)


def test_vision_route_valid():
    data = understanding_data("vision", words=[],
                              segments=[{"start": 0, "end": 5, "text": None, "visual": "a cat"}])
    assert Understanding.model_validate(data).route == "vision"


def test_both_route_allows_text_and_visual_together():
    data = understanding_data("both", segments=[{"start": 0, "end": 5, "text": "hi", "visual": "a cat"}])
    assert Understanding.model_validate(data).segments[0].visual == "a cat"


@pytest.mark.parametrize("route,changes", [
    ("vision", {"segments": []}),  # vision route keeps the default words list
    ("vision", {"words": [], "segments": [{"start": 0, "end": 5, "text": "hi", "visual": "x"}]}),
    ("transcript", {"segments": [{"start": 0, "end": 5, "text": "hi", "visual": "x"}]}),
    ("transcript", {"segments": [{"start": 0, "end": 5, "text": None, "visual": "x"}]}),
    ("both", {"segments": [{"start": 0, "end": 5, "text": None, "visual": None}]}),
    ("both", {"segments": [{"start": 5, "end": 5, "text": "hi"}]}),
    ("transcript", {"words": [{"w": "hi", "start": 2.0, "end": 1.0}]}),
    ("transcript", {"segments": [{"start": 5, "end": 6, "text": "b"}, {"start": 1, "end": 2, "text": "a"}]}),
    ("transcript", {"segments": [{"start": 0, "end": 21.5, "text": "too long"}]}),
    ("transcript", {"speech_ratio": 1.2}),
    ("transcript", {"route": "audio"}),
    ("transcript", {"notes": "extra field"}),
])
def test_understanding_rejects_invalid(route, changes):
    with pytest.raises(ValidationError):
        Understanding.model_validate(understanding_data(route, **changes))


def test_small_overrun_past_duration_is_allowed():
    data = understanding_data(segments=[{"start": 0, "end": 20.5, "text": "ok"}])
    assert Understanding.model_validate(data).segments[0].end == 20.5
