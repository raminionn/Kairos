"""Form fields (a "brief") -> deck + brand. Every slide is built only from what the user typed: nothing is invented."""
from __future__ import annotations

import base64
import io
import re
from pathlib import Path

from .parse import _title

GOALS = {
    "launch": {"tape": "See what's new →", "folder": "NEW", "cta": "Ready to try {name}?", "button": "Get started"},
    "tips": {"tape": "Let's get into it →", "folder": "TIPS", "cta": "Want more like this?", "button": "Follow for more"},
    "offer": {"tape": "See the offer →", "folder": "OFFER", "cta": "Ready to claim it?", "button": "Claim the offer"},
    "educate": {"tape": "Let's learn →", "folder": "GUIDE", "cta": "Want to learn more?", "button": "Learn more"},
}
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
MAX_POINTS, MAX_STEPS = 5, 5


def _s(v, field, mx, required=False):
    v = re.sub(r"\s+", " ", str(v if v is not None else "")).strip()
    if required and not v:
        raise ValueError(f"{field} is required.")
    if len(v) > mx:
        raise ValueError(f"{field} is too long ({len(v)} characters, the limit is {mx}).")
    return v


# ---------- images: validated and shrunk so the HTML stays small and safe ----------
def _raw(value, what, max_bytes=4_000_000):
    if not value:
        return None
    if str(value).startswith("data:"):
        try:
            raw = base64.b64decode(str(value).split(",", 1)[1])
        except Exception:
            raise ValueError(f"{what}: could not read the image data.")
    else:
        p = Path(value)
        if not p.exists():
            raise ValueError(f"{what}: file not found: {value}")
        raw = p.read_bytes()
    if len(raw) > max_bytes:
        raise ValueError(f"{what} is larger than {max_bytes // 1_000_000} MB.")
    return raw


def _open(raw, what):
    try:
        from PIL import Image
    except ImportError:
        raise ValueError("Pillow is needed for logo/screenshot images: pip install pillow")
    Image.MAX_IMAGE_PIXELS = 40_000_000
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
        return Image, im
    except Exception:
        raise ValueError(f"{what} is not a readable image (use PNG, JPG or WebP).")


def _uri(im, fmt="PNG", **kw):
    buf = io.BytesIO()
    im.save(buf, fmt, **kw)
    return f"data:image/{fmt.lower()};base64," + base64.b64encode(buf.getvalue()).decode()


def normalize_logo(value):
    raw = _raw(value, "Logo")
    if raw is None:
        return None
    Image, im = _open(raw, "Logo")
    im = im.convert("RGBA")
    w, h = im.size
    s = min(w, h)
    x, y = (w - s) // 2, (h - s) // 2
    return _uri(im.crop((x, y, x + s, y + s)).resize((256, 256), getattr(Image, "Resampling", Image).LANCZOS))


def normalize_screenshot(value):
    raw = _raw(value, "Screenshot")
    if raw is None:
        return None
    Image, im = _open(raw, "Screenshot")
    im = im.convert("RGB")
    if im.width > 720:
        im = im.resize((720, round(im.height * 720 / im.width)), getattr(Image, "Resampling", Image).LANCZOS)
    uri = _uri(im, "PNG", optimize=True)
    return uri if len(uri) < 2_000_000 else _uri(im, "JPEG", quality=85)


# ---------- brief -> deck ----------
def _points(rows):
    out = []
    for i, p in enumerate(rows or [], 1):
        if isinstance(p, str):
            p = {"heading": p}
        head = _s(p.get("heading"), f"Point {i} heading", 80)
        detail = _s(p.get("detail"), f"Point {i} detail", 220)
        items = [_s(x, f"Point {i} item", 70) for x in (p.get("items") or []) if str(x).strip()][:6]
        if not (head or detail or items):
            continue
        if not head:
            raise ValueError(f"Point {i} needs a heading.")
        out.append({"heading": head, "detail": detail, "items": items})
    if len(out) > MAX_POINTS:
        raise ValueError(f"Use at most {MAX_POINTS} key points (you gave {len(out)}): a carousel works best when each slide has one idea.")
    return out


def deck_from_brief(brief: dict):
    b = brief.get("brand") or {}
    name = _s(b.get("name"), "Product name", 40, True)
    handle = _s(b.get("handle"), "Handle", 40)
    handle = ("@" + handle.lstrip("@")) if handle else ""
    site = re.sub(r"^https?://", "", _s(b.get("site"), "Website", 60)).rstrip("/")
    primary = b.get("primary") or "#1f6f4a"
    if not HEX.match(primary):
        raise ValueError("Brand colour must look like #1f6f4a.")
    topic = _s(brief.get("topic"), "Topic", 80, True)
    goal = brief.get("goal") or "launch"
    if goal not in GOALS:
        raise ValueError(f"Goal must be one of {sorted(GOALS)}.")
    g = GOALS[goal]
    series = _s(brief.get("series"), "Series label", 40) or (topic if len(topic) <= 34 else name)

    points = _points(brief.get("points"))
    steps = [_s(x, "Step", 80) for x in (brief.get("steps") or []) if str(x).strip()]
    if len(steps) > MAX_STEPS:
        raise ValueError(f"Use at most {MAX_STEPS} steps.")
    problem = _s(brief.get("problem"), "Problem", 220)
    offer = _s(brief.get("offer"), "Offer", 220)
    stats = [x for x in (brief.get("stats") or []) if str(x.get("label", "")).strip() or str(x.get("value", "")).strip()]
    if not (points or steps or offer):
        raise ValueError("Add at least one key point, step or offer: the carousel is built only from what you enter.")

    slides = [{"type": "cover", "title": _s(brief.get("hook"), "Cover title", 90) or _title(topic), "tape": g["tape"]}]
    if problem:
        slides.append(_content(_s(brief.get("problem_heading"), "Problem heading", 60) or "Sound familiar?", [{"p": problem}]))
    if len(points) >= 3:
        heads = [p["heading"] for p in points]
        if len(heads) <= 4 and all(len(h) <= 14 for h in heads):
            slides.append(_content("At a glance", [{"p": f"{len(heads)} things to know."}], media={"kind": "orbs", "items": heads}))
        else:
            slides.append(_content("At a glance", [{"list": heads[:6], "style": "check"}], layout="right",
                                   media={"kind": "folder", "label": g["folder"], "tab": name.upper()[:18]}))
    for p in points:
        blocks = ([{"p": p["detail"]}] if p["detail"] else []) + ([{"list": p["items"], "style": "check"}] if p["items"] else [])
        slides.append(_content(p["heading"], blocks))
    if steps:
        shot = normalize_screenshot(brief.get("screenshot"))
        slides.append(_content("How it works", [{"list": steps, "style": "bullet"}], layout="right", media={"kind": "phone", "src": shot}))
    if stats:
        if not 2 <= len(stats) <= 6:
            raise ValueError("Numbers: give between 2 and 6 values (or leave them out).")
        try:
            items = [{"v": float(x["value"]), "label": _s(x.get("label"), "Number label", 30)} for x in stats]
        except (KeyError, TypeError, ValueError):
            raise ValueError("Each number needs a numeric value, e.g. 40.")
        slides.append(_content("By the numbers", [], media={"kind": "bars", "items": items, "unit": _s(brief.get("stats_unit"), "Unit", 3)}))
    if offer:
        slides.append(_content("The offer", [{"p": offer}]))
    cta = brief.get("cta") or {}
    slides.append({"type": "cta", "heading": _s(cta.get("heading"), "Closing line", 80) or g["cta"].format(name=name),
                   "button": _s(cta.get("button"), "Button text", 40) or g["button"], "goto": site})

    brand = {"name": name, "handle": handle, "site": site, "series": series, "primary": primary,
             "avatar": normalize_logo(b.get("logo")), "tape": g["tape"], "cta": {"button": None, "goto": site}}
    return {"slides": slides, "overrides": {}}, brand


def _content(heading, blocks, layout=None, media=None):
    return {"type": "content", "heading": heading, "blocks": blocks, "layout": layout, "media": media, "lead": None}
