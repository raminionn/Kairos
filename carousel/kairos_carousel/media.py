"""Deterministic media blocks: inline SVG / HTML built from data. No image models."""
from __future__ import annotations

import base64
import math
import mimetypes
import textwrap
from pathlib import Path

from markupsafe import Markup, escape

MIME = {".jfif": "image/jpeg", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml"}
ORB = [("#ffb066", "#e8590c"), ("#6db3ff", "#1d4ed8"), ("#b79cff", "#6d28d9"), ("#ffe27a", "#f59e0b")]
ORB_POS = {1: [(450, 170)], 2: [(290, 170), (610, 170)], 3: [(230, 230), (450, 110), (670, 230)],
           4: [(240, 150), (600, 130), (150, 400), (700, 390)]}


def data_uri(path, base_dir) -> str:
    if str(path).startswith("data:"):
        return str(path)
    p = Path(path)
    if not p.is_absolute():
        p = Path(base_dir) / p
    if not p.exists():
        raise FileNotFoundError(f"Image not found: {p}")
    mime = MIME.get(p.suffix.lower()) or mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()


def render_media(m: dict, brand: dict, base_dir, uid: str) -> Markup:
    fn = {"image": _image, "phone": _phone, "folder": _folder, "donut": _donut,
          "bars": _bars, "orbs": _orbs}.get(m["kind"])
    if fn is None:
        raise ValueError(f"Unknown media kind: {m['kind']!r}")
    return Markup(fn(m, brand, base_dir, uid))


def _image(m, brand, base, uid):
    if m.get("frame") == "phone":
        return _phone(m, brand, base, uid)
    return f'<img class="m-image" src="{data_uri(m["src"], base)}" alt="">'


def _phone(m, brand, base, uid):
    if m.get("src"):
        inner = f'<img src="{data_uri(m["src"], base)}" alt="">'
        return f'<div class="phone"><div class="phone__screen">{inner}</div></div>'
    sk = '<i class="sk sk--title"></i><i class="sk sk--card"></i><i class="sk sk--row"></i><i class="sk sk--row"></i><i class="sk sk--card sk--short"></i>'
    return f'<div class="phone"><div class="phone__screen phone__screen--blank">{sk}</div></div>'


def _folder(m, brand, base, uid):
    tab = f'<div class="folder__tab" data-guard="text">{escape(m["tab"])}</div>' if m.get("tab") else ""
    return (f'<div class="folder">{tab}<div class="folder__body">'
            f'<span class="folder__label" data-guard="text">{escape(m["label"])}</span></div></div>')


def _wrap(text, width):
    return textwrap.wrap(text, width=width, break_long_words=False) or [""]


def _arc(cx, cy, r0, r1, a0, a1):
    big = 1 if (a1 - a0) > math.pi else 0
    p = lambda r, a: (cx + r * math.cos(a), cy + r * math.sin(a))
    (x0o, y0o), (x1o, y1o), (x1i, y1i), (x0i, y0i) = p(r1, a0), p(r1, a1), p(r0, a1), p(r0, a0)
    return (f"M{x0o:.1f},{y0o:.1f} A{r1},{r1} 0 {big} 1 {x1o:.1f},{y1o:.1f} "
            f"L{x1i:.1f},{y1i:.1f} A{r0},{r0} 0 {big} 0 {x0i:.1f},{y0i:.1f} Z")


def _donut(m, brand, base, uid):
    items = m["items"]
    total = sum(i["v"] for i in items)
    if total <= 0:
        raise ValueError("Chart values must add up to more than 0.")
    pal = brand["colors"]["chart"]
    cx, cy, r1, r0 = 420, 300, 175, 62
    a, segs, labs = -math.pi / 2, [], []
    for k, it in enumerate(items):
        span = min(it["v"] / total * 2 * math.pi, 2 * math.pi - 0.001)
        a0, a1 = a, a + span
        am, a = (a0 + a1) / 2, a1
        segs.append(f'<path d="{_arc(cx, cy, r0, r1, a0, a1)}" fill="{pal[k % len(pal)]}" stroke="#fff" stroke-width="4"/>')
        c, s = math.cos(am), math.sin(am)
        x1, y1, x2, y2 = cx + (r1 + 8) * c, cy + (r1 + 8) * s, cx + (r1 + 40) * c, cy + (r1 + 40) * s
        anchor, tx = ("start", x2 + 14) if c > 0.25 else ("end", x2 - 14) if c < -0.25 else ("middle", x2)
        lines = _wrap(it["label"], 14) if it["label"] else []
        ty = y2 - 36 - 28 * (len(lines) - 1) - 8 if s < -0.6 else y2 + 40 if s > 0.6 else y2 + 12
        labs.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#9a9a9a" stroke-width="2"/>')
        labs.append(f'<text class="t-pct" x="{tx:.1f}" y="{ty:.1f}" text-anchor="{anchor}" data-guard="text">{round(it["v"] / total * 100)}%</text>')
        for j, ln in enumerate(lines):
            labs.append(f'<text class="t-lab" x="{tx:.1f}" y="{ty + 36 + 28 * j:.1f}" text-anchor="{anchor}" data-guard="text">{escape(ln)}</text>')
    rings = "".join(f'<circle cx="{cx}" cy="{cy}" r="{r0 + (r1 - r0) * k / 6:.1f}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>' for k in range(1, 6))
    return f'<svg class="m-svg" viewBox="0 0 840 600" role="img">{"".join(segs)}{rings}{"".join(labs)}</svg>'


def _bars(m, brand, base, uid):
    items = m["items"][:6]
    n, vmax = len(items), max(i["v"] for i in items) or 1
    W, base_y, hmax, gap = 760, 470, 340, 36
    bw = min(120, (W - 80 - (n - 1) * gap) / n)
    x0 = (W - (n * bw + (n - 1) * gap)) / 2
    acc = brand["colors"]["accent"]
    out = [f'<line x1="40" y1="{base_y}" x2="{W - 40}" y2="{base_y}" stroke="#cfcfcf" stroke-width="2"/>']
    for k, it in enumerate(items):
        h = max(6, it["v"] / vmax * hmax)
        x, y = x0 + k * (bw + gap), base_y - h
        fill = acc if it["v"] == vmax else "#d2d2d2"
        unit = m.get("unit")
        val = f'{it["v"]:g}' + (unit if unit is not None else ("%" if vmax <= 100 else ""))
        out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{h:.1f}" rx="10" fill="{fill}"/>')
        out.append(f'<text class="t-pct" x="{x + bw / 2:.1f}" y="{y - 14:.1f}" text-anchor="middle" data-guard="text">{val}</text>')
        for j, ln in enumerate(_wrap(it["label"], 11) if it["label"] else []):
            out.append(f'<text class="t-lab" x="{x + bw / 2:.1f}" y="{base_y + 38 + 30 * j}" text-anchor="middle" data-guard="text">{escape(ln)}</text>')
    return f'<svg class="m-svg" viewBox="0 0 {W} 560" role="img">{"".join(out)}</svg>'


def _orbs(m, brand, base, uid):
    items = m["items"]
    if not 1 <= len(items) <= 4:
        raise ValueError("orbs supports 1-4 items, separated by |")
    ax, ay, out, defs = 450, 690, [], []
    for k, label in enumerate(items):
        cx, cy = ORB_POS[len(items)][k]
        c1, c2 = ORB[k % 4]
        defs.append(f'<radialGradient id="{uid}-o{k}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient>')
        out.append(f'<path d="M{cx},{cy + 84} Q{cx},{(cy + ay) / 2 + 70:.0f} {ax},{ay}" fill="none" stroke="#c4c4c4" stroke-width="2.5"/>')
        out.append(f'<circle cx="{cx}" cy="{cy}" r="84" fill="#fff" stroke="#cfcfcf" stroke-width="3"/>')
        out.append(f'<circle cx="{cx}" cy="{cy}" r="62" fill="url(#{uid}-o{k})"/>')
        out.append(f'<ellipse cx="{cx - 14}" cy="{cy - 20}" rx="30" ry="16" fill="#fff" fill-opacity=".28" transform="rotate(-25 {cx - 14} {cy - 20})"/>')
        out.append(f'<text class="t-orb" x="{cx}" y="{cy - 106}" text-anchor="middle" data-guard="text">{escape(label.upper())}</text>')
    out.append(f'<circle cx="{ax}" cy="{ay}" r="9" fill="{brand["colors"]["ink"]}"/>')
    return f'<svg class="m-svg" viewBox="0 0 900 720" role="img"><defs>{"".join(defs)}</defs>{"".join(out)}</svg>'
