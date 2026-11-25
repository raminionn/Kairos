"""text/deck -> HTML -> layout guard -> PNGs + LinkedIn PDF."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from .guard import run_guard
from .claims import unverified_claims
from .parse import deck_from_topic, outline_from_command, parse_text
from .render import build_html, load_brand

W, H = 1080, 1350  # LinkedIn document/carousel 4:5


@dataclass
class Issue:
    slide: int  # 1-based, 0 = whole deck
    sev: str    # error | warn | info
    kind: str
    msg: str


@dataclass
class Report:
    issues: list[Issue] = field(default_factory=list)
    files: dict = field(default_factory=dict)
    exported: bool = False

    @property
    def errors(self):
        return [i for i in self.issues if i.sev == "error"]

    def summary(self) -> str:
        rows = [f'  [{i.sev.upper():5}] {"deck" if not i.slide else f"slide {i.slide}"}: {i.msg}' for i in self.issues]
        head = "Layout guard: " + ("PASSED" if not self.errors else f"{len(self.errors)} error(s)")
        return "\n".join([head] + rows)


def load_deck(source) -> dict:
    if isinstance(source, dict):
        return source
    if isinstance(source, Path) or (isinstance(source, str) and "\n" not in source and Path(source).exists()):
        p = Path(source)
        text = p.read_text(encoding="utf-8")
        return json.loads(text) if p.suffix.lower() == ".json" else parse_text(text)
    return parse_text(str(source))


def build_carousel(source, brand=None, out_dir="out", *, png=True, force=False, allowed_facts=None) -> Report:
    from playwright.sync_api import sync_playwright

    deck, b = load_deck(source), load_brand(brand)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    html, missing = build_html(deck, b)
    rep = Report([Issue(0, "warn", "font", m) for m in missing])
    if allowed_facts is not None:  # copy came from a model: every statistic must trace back to the user's own facts
        rep.issues += [Issue(i, "error", "claim", f"'{tok}' is not in the command or product facts; remove it or add it to product.facts")
                       for i, tok in unverified_claims(deck, allowed_facts)]

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
            page.set_content(html, wait_until="load")
            page.evaluate("document.fonts.ready.then(() => true)")
            n = page.locator(".slide").count()
            found, fits = run_guard(page, n)
            rep.issues += [Issue(x["slide"] + 1, x["sev"], x["kind"], x["msg"]) for x in found]
            if rep.errors and not force:
                (out / "report.json").write_text(json.dumps([i.__dict__ for i in rep.issues], indent=2), encoding="utf-8")
                return rep
            (out / "carousel.html").write_text(page.content(), encoding="utf-8")
            rep.files["html"] = str(out / "carousel.html")
            if png:
                for i in range(n):
                    f = out / f"slide-{i + 1:02d}.png"
                    page.locator(f'.slide[data-index="{i}"]').screenshot(path=str(f))
                    rep.files.setdefault("png", []).append(str(f))
            page.emulate_media(media="print")
            pdf = out / "carousel.pdf"
            page.pdf(path=str(pdf), width=f"{W}px", height=f"{H}px", print_background=True,
                     margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}, prefer_css_page_size=True)
            rep.files["pdf"] = str(pdf)
        finally:
            browser.close()

    try:
        from pypdf import PdfReader
        pages = len(PdfReader(str(pdf)).pages)
        if pages != n:
            rep.issues.append(Issue(0, "error", "pdf", f"PDF has {pages} pages but the deck has {n} slides"))
    except ImportError:
        pass
    rep.exported = True
    (out / "report.json").write_text(json.dumps([i.__dict__ for i in rep.issues], indent=2), encoding="utf-8")
    return rep


def build_from_command(command: str, brand, llm, out_dir="out", *, slides=7, png=True, force=False) -> Report:
    """Text command + the user's brand/product profile -> carousel PDF."""
    b = load_brand(brand)
    deck = outline_from_command(command, b, llm, slides=slides)
    allowed = command + "\n" + "\n".join(b.get("product", {}).get("facts", []))
    return build_carousel(deck, brand, out_dir, png=png, force=force, allowed_facts=allowed)


def build_from_topic(topic: str, brand, out_dir="out", *, max_slides=8, png=True, force=False) -> Report:
    """Deterministic, no AI and no API key: topic + the user's product points/facts -> carousel PDF."""
    return build_carousel(deck_from_topic(topic, load_brand(brand), max_slides=max_slides), brand, out_dir, png=png, force=force)


def build_from_brief(brief: dict, out_dir="out", *, png=True, force=False) -> Report:
    """Form fields -> complete carousel. Deterministic: no AI, no key."""
    from .brief import deck_from_brief

    deck, brand = deck_from_brief(brief)
    return build_carousel(deck, brand, out_dir, png=png, force=force)
