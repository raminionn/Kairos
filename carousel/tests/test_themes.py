"""Themes, per-point images and people (photo + logo). Renders through the real layout guard."""
import base64
import io
import json
from pathlib import Path

import pytest
from PIL import Image

from kairos_carousel import build_from_brief
from kairos_carousel.brief import deck_from_brief
from kairos_carousel.render import THEMES, build_html

EX = Path(__file__).resolve().parents[1] / "examples"


def png_uri(color=(200, 80, 40), size=(400, 300)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def brief(**extra):
    b = json.loads((EX / "brief_flowdesk.json").read_text(encoding="utf-8"))
    b["brand"].pop("logo", None)
    b.update(extra)
    return b


def test_known_themes():
    assert set(THEMES) == {"editorial", "midnight", "notebook", "bold"}


def test_unknown_theme_is_a_plain_error():
    with pytest.raises(ValueError, match="Theme must be one of"):
        deck_from_brief(brief(theme="neon"))


def test_theme_picks_its_own_stylesheet():
    deck, brand = deck_from_brief(brief(theme="midnight"))
    html, _ = build_html(deck, {**_full(brand)})
    assert 'class="deck theme-midnight"' in html


def test_point_image_becomes_slide_media():
    b = brief()
    b["points"][0]["image"] = png_uri()
    deck, _ = deck_from_brief(b)
    slide = next(s for s in deck["slides"] if s.get("heading") == b["points"][0]["heading"])
    assert slide["media"]["kind"] == "image" and slide["media"]["src"].startswith("data:image/")


def test_person_photo_and_name_go_to_the_footer():
    b = brief()
    b["brand"].update({"person": "Morgan Maxwell", "photo": png_uri((30, 30, 30), (300, 300)), "logo": png_uri((10, 90, 200), (300, 300))})
    _, brand = deck_from_brief(b)
    assert brand["person"] == "Morgan Maxwell"
    assert brand["avatar"].startswith("data:image/") and brand["logo"].startswith("data:image/")


@pytest.mark.parametrize("theme", ["editorial", "midnight", "notebook", "bold"])
def test_every_theme_passes_the_layout_guard(theme, tmp_path):
    b = brief(theme=theme)
    b["brand"].update({"person": "Morgan Maxwell", "photo": png_uri((60, 60, 60), (300, 300))})
    b["points"][1]["image"] = png_uri()
    rep = build_from_brief(b, str(tmp_path))
    assert not rep.errors, rep.summary()
    assert (tmp_path / "carousel.pdf").exists()


def _full(brand):
    from kairos_carousel.render import load_brand  # resolved brand, as the pipeline builds it
    return load_brand(brand)
