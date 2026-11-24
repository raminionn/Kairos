import pytest
from pydantic import ValidationError

import contracts.genres as genres
from contracts import GENRES, UNKNOWN_GENRE, Understanding
from understanding.genre import GenreResult, classify_genre

BASE = {"video_id": "t1", "duration": 10.0, "route": "transcript", "speech_ratio": 0.8, "asr_confidence": 0.9}


def test_unknown_is_an_allowed_genre():
    assert UNKNOWN_GENRE in GENRES


@pytest.mark.parametrize("genre", GENRES)
def test_every_listed_genre_is_accepted(genre):
    assert Understanding.model_validate({**BASE, "genre": genre}).genre == genre


@pytest.mark.parametrize("genre", ["interview", "Talk", "", "podcast"])
def test_unlisted_genre_is_rejected(genre):
    with pytest.raises(ValidationError):
        Understanding.model_validate({**BASE, "genre": genre})


def test_adding_a_genre_in_contracts_is_enough(monkeypatch):
    monkeypatch.setattr(genres, "GENRES", GENRES + ("podcast",))
    assert Understanding.model_validate({**BASE, "genre": "podcast"}).genre == "podcast"
    assert GenreResult("podcast", 0.5).genre == "podcast"


def test_genre_result_checks_genre_and_confidence():
    with pytest.raises(ValueError):
        GenreResult("interview", 0.5)
    with pytest.raises(ValueError):
        GenreResult("talk", 1.5)


def test_classifier_stub():
    result = classify_genre([], 10.0)
    assert result.is_stub
    assert (result.genre, result.confidence) == (UNKNOWN_GENRE, 0.0)
