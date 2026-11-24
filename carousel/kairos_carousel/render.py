"""Deck dict + brand -> one self-contained HTML file (fonts and images embedded)."""
from __future__ import annotations

import base64
import colorsys
import copy
import json
import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup, escape

from . import media as M

PKG = Path(__file__).parent
SAFE_CSS = re.compile(r"^[#\w(),.%\s/-]+$")
SAFE_FONT = re.compile(r"^[\w \-]+$")

DEFAULT_BRAND = {
    "name": "Your Brand", "handle": "@yourhandle", "site": "yourdomain.com", "series": "Your series",
    "avatar": None, "save_text": "SAVE for LATER", "tape": "Let's find out →",
    "cta": {"heading": None, "button": "Book a 15-min call", "goto": None},
    "colors": {"bg": "#ffffff", "ink": "#0b0b0b", "muted": "#666666", "accent": "#b3362e", "ring": "#f6c90e",
               "handle": "#333333", "chart": ["#111111", "#b3362e", "#8c8c8c", "#d4d4d4", "#555555"]},
    "cover": {"bg": "#0f5c3e", "grid": "rgba(255,255,255,.14)", "card": "#f3f0ea", "ink": "#1b1414",
              "hl1": "#cfc6f5", "hl1_handle": "#6d4fd6", "hl2": "#b9e3cf", "hl2_handle": "#0e6b4a",
              "tape": "#d9cdb8", "folder": "#e8650f", "bookmark": "#8f7df0"},
    "cta_button": {"bg": "#000000", "ink": "#ffffff"},
    "fonts": {"display": "Playfair Display", "sans": "Inter", "handle": "Poppins"},
    "font_files": [],
    "product": {"description": "", "audience": "", "tone": "clear and friendly", "facts": []},
}
BUNDLED_FONTS = [
    {"family": "Inter", "file": "Inter.ttf", "weight": "100 900"},
    {"family": "Playfair Display", "file": "PlayfairDisplay.ttf", "weight": "400 900"},
    {"family": "Poppins", "file": "Poppins-Regular.ttf", "weight": "400"},
    {"family": "Poppins", "file": "Poppins-Medium.ttf", "weight": "500"},
    {"family": "Poppins", "file": "Poppins-SemiBold.ttf", "weight": "600"},
]
FIT_CSS = lambda s: f"{s:g}"


# ---- one brand colour -> a full theme, with contrast guaranteed ----
def _rgb(h):
    h = h.lstrip("#")
    h = "".join(c * 2 for c in h) if len(h) == 3 else h
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hex(rgb):
    return "#" + "".join(f"{round(max(0, min(255, v))):02x}" for v in rgb)


def _lum(rgb):
    f = lambda v: (v / 255 / 12.92) if v / 255 <= 0.03928 else ((v / 255 + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2])


def contrast(a, b):
    la, lb = _lum(_rgb(a)), _lum(_rgb(b))
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def _hls(h, l, s):
    return _hex(tuple(v * 255 for v in colorsys.hls_to_rgb(h % 1.0, l, s)))


def _darken_until(color, need, against="#ffffff"):
    h, l, s = colorsys.rgb_to_hls(*[v / 255 for v in _rgb(color)])
    while contrast(_hls(h, l, s), against) < need and l > 0.05:
        l -= 0.01
    return _hls(h, l, s)


def _near(h, target, tol=0.07):
    """True when hue h is close to target (hues wrap around), so a decoration in that colour would clash."""
    return abs(((h - target + 0.5) % 1) - 0.5) < tol


def derive_theme(primary: str) -> dict:
    h, l, s = colorsys.rgb_to_hls(*[v / 255 for v in _rgb(primary)])
    s = s if s < 0.08 else max(s, 0.35)  # keep greys neutral, give weak colours some body
    deep = _darken_until(_hls(h, l, s), 6.0)       # cover background: white text stays readable
    accent = _darken_until(_hls(h, l, s), 4.5)     # folder, highlighted bar: white text on it stays readable
    return {
        "colors": {"accent": accent, "ring": _hls(h + 0.14, 0.55, 0.9), "chart": ["#111111", accent, "#8c8c8c", "#d4d4d4", "#555555"]},
        "cover": {"bg": deep, "card": _hls(h, 0.955, 0.18), "tape": _hls(h + 0.08, 0.8, 0.25),
                  "hl1": _hls(h + 0.72, 0.88, 0.65), "hl1_handle": _hls(h + 0.72, 0.42, 0.6),
                  "hl2": _hls(h, 0.86, 0.45), "hl2_handle": _hls(h, 0.30, 0.6),
                  # orange folder and violet bookmark like the reference, switched only when the brand colour is close to them
                  "folder": _hls(0.58, 0.5, 0.75) if _near(h, 0.07) else "#e8650f",
                  "bookmark": _hls(0.5, 0.45, 0.6) if _near(h, 0.72) else "#8f7df0"},
    }


def _merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            _merge(dst[k], v)
        else:
            dst[k] = v


def load_brand(src=None) -> dict:
    brand, base = copy.deepcopy(DEFAULT_BRAND), Path.cwd()
    if src:
        if isinstance(src, (str, Path)):
            p = Path(src)
            data, base = json.loads(p.read_text(encoding="utf-8")), p.resolve().parent
        else:
            data = dict(src)
        if data.get("primary"):  # derived first, so explicit colours in the brand still win
            _merge(brand, derive_theme(data["primary"]))
        _merge(brand, {k: v for k, v in data.items() if k != "primary"})
    brand["_base"] = str(base)
    return brand


def _css_ok(v):
    if not SAFE_CSS.match(str(v)):
        raise ValueError(f"Unsafe or invalid CSS value in brand: {v!r}")
    return v


def _fonts_css(brand):
    css, missing, have = [], [], set()
    for f in BUNDLED_FONTS + brand.get("font_files", []):
        p = Path(f["file"])
        p = p if p.is_absolute() else (Path(brand["_base"]) / p if (Path(brand["_base"]) / p).exists() else PKG / "fonts" / p)
        if not p.exists():
            continue
        have.add(f["family"])
        b64 = base64.b64encode(p.read_bytes()).decode()
        css.append(f'@font-face{{font-family:"{f["family"]}";src:url(data:font/ttf;base64,{b64}) format("truetype");'
                   f'font-weight:{f.get("weight", "400")};font-style:normal;font-display:block}}')
    for role, fam in brand["fonts"].items():
        if not SAFE_FONT.match(fam):
            raise ValueError(f"Invalid font name for {role}: {fam!r}")
        if fam not in have:
            missing.append(f'font "{fam}" ({role}) is not bundled, so a fallback font is used and text widths may differ. Run fetch_fonts.py or add it under brand.font_files.')
    return "".join(css), missing


def _vars(brand):
    c, v, b = brand["colors"], brand["cover"], brand["cta_button"]
    f = brand["fonts"]
    pairs = {"bg": c["bg"], "ink": c["ink"], "muted": c["muted"], "accent": c["accent"], "ring": c["ring"],
             "handle-ink": c["handle"], "c-bg": v["bg"], "c-grid": v["grid"], "c-card": v["card"], "c-ink": v["ink"],
             "hl1": v["hl1"], "hl1-h": v["hl1_handle"], "hl2": v["hl2"], "hl2-h": v["hl2_handle"],
             "c-tape": v["tape"], "btn-bg": b["bg"], "btn-ink": b["ink"]}
    s = "".join(f"--{k}:{_css_ok(x)};" for k, x in pairs.items())
    s += (f'--f-display:"{f["display"]}",Georgia,"Times New Roman",serif;'
          f'--f-sans:"{f["sans"]}","Helvetica Neue",Arial,sans-serif;'
          f'--f-handle:"{f["handle"]}","{f["sans"]}",Arial,sans-serif;')
    return ":root{" + s + "}"


def title_html(raw: str) -> Markup:
    raw, out, n = raw.replace(" | ", "\n"), [], 0
    for part in re.split(r"(==.+?==)", raw):
        if len(part) > 4 and part.startswith("==") and part.endswith("=="):
            n += 1
            wrap = " hl--wrap" if len(part) - 4 > 12 else ""  # short phrases stay on one line, long ones may wrap
            out.append(f'<mark class="hl hl--{(n - 1) % 2 + 1}{wrap}" data-guard="text">{escape(part[2:-2])}</mark>')
        else:
            out.append(str(escape(part)).replace("\n", "<br>"))
    return Markup("".join(out))


def _avatar(brand):
    if brand.get("avatar"):
        return Markup(f'<span class="avatar"><img src="{M.data_uri(brand["avatar"], brand["_base"])}" alt=""></span>')
    initials = "".join(w[0] for w in brand["name"].split()[:2]).upper() or "?"
    return Markup(f'<span class="avatar avatar--initials" data-guard="text">{escape(initials)}</span>')


def _normalize(slides, brand):
    slides = list(slides)
    if not slides or slides[0]["type"] != "cover":
        raise ValueError("The first slide must be a cover (start with 'Title: ...' or a title block).")
    cta = brand["cta"]
    if slides[-1]["type"] != "cta" and cta.get("heading"):
        slides.append({"type": "cta", "heading": cta["heading"], "button": None, "goto": None})
    return slides


def _resolve(s, i, brand, fits):
    s = dict(s)
    if fits and fits.get(i, 1) != 1:
        s["fit"] = FIT_CSS(fits[i])
    if s["type"] == "cover":
        s["title_html"] = title_html(s["title"])
        tape = (s.get("tape") or brand["tape"]).strip()
        s["tape_arrow"], s["tape"] = tape.endswith("→"), tape.rstrip("→ ").strip()
    elif s["type"] == "cta":
        s["button"] = s.get("button") or brand["cta"]["button"]
        s["goto"] = s.get("goto") or brand["cta"].get("goto") or brand["site"]
    else:
        media, blocks = s.get("media"), s["blocks"]
        has_list = any("list" in b for b in blocks)
        layout = s.get("layout") or ("none" if not media else "right" if media["kind"] == "phone" and has_list else "bottom")
        lead = s.get("lead")
        if lead is None:
            lead = 1 if layout in ("left", "right") and blocks and "p" in blocks[0] and has_list else 0
        if layout in ("bottom", "none"):
            lead = 0
        s["layout"], s["lead_blocks"], s["detail_blocks"] = layout, blocks[:lead], blocks[lead:]
        s["media_html"] = M.render_media(media, brand, brand["_base"], f"s{i}") if media else None
    return s


def build_html(deck: dict, brand: dict, fits: dict | None = None):
    brand = copy.deepcopy(brand)
    brand.update({k: v for k, v in deck.get("overrides", {}).items() if k in ("series", "site", "handle", "name")})
    slides = [_resolve(s, i, brand, fits) for i, s in enumerate(_normalize(deck["slides"], brand))]
    fonts, missing = _fonts_css(brand)
    env = Environment(loader=FileSystemLoader(PKG / "templates"), autoescape=select_autoescape(["j2"]))
    html = env.get_template("deck.html.j2").render(
        brand=brand, slides=slides, avatar=_avatar(brand), fonts_css=Markup(fonts), vars_css=Markup(_vars(brand)),
        css=Markup((PKG / "static" / "deck.css").read_text(encoding="utf-8")), title=brand["series"])
    return html, missing
