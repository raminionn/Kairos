"""Pasted text -> deck dict. Plain string rules, no AI.

Format (see README):  blocks split by `---` (or by blank lines when there is no `---`).
First block = cover. In each block: line 1 = heading, other lines = paragraphs or list
items (-, *, •, ✓, 1.). `@key: value` lines set layout / media. `CTA: heading | button | goto`
makes the closing slide.
"""
from __future__ import annotations

import re
from typing import Callable

BULLET = re.compile(r"^(?P<m>[-*•▪●◦✓✔☑]|\d{1,2}[.)])\s+(?P<t>\S.*)$")
CHECKS = set("✓✔☑")
DIRECTIVE = re.compile(r"^@(?P<k>[A-Za-z_]+)\s*:\s*(?P<v>.*)$")
HEAD_PREFIX = re.compile(r"^(?:#{1,3}\s+|\d{1,2}[.)]\s+)")
SENTENCE = re.compile(r"(?<=[.!?])\s+")
MAX_HEADING = 95
DECK_KEYS = {"series", "site", "handle", "name"}
LAYOUTS = {"bottom", "right", "left", "none"}


def parse_text(text: str) -> dict:
    text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    chunks = _split(text)
    if not chunks:
        raise ValueError("Nothing to parse: the text is empty.")
    slides, overrides = [], {}
    for i, lines in enumerate(chunks):
        d, body = _directives(lines)
        overrides.update({k: d[k] for k in DECK_KEYS & d.keys()})
        if body:
            slides.append(_slide(body, d, first=(i == 0)))
    if not slides:
        raise ValueError("Nothing to parse: no slide text found.")
    return {"slides": slides, "overrides": overrides}


def _split(text: str) -> list[list[str]]:
    lines = text.split("\n")
    by_rule = any(l.strip() == "---" for l in lines)
    chunks, cur = [], []
    for l in lines:
        cut = (l.strip() == "---") if by_rule else (l.strip() == "")
        if cut:
            if any(x.strip() for x in cur):
                chunks.append(cur)
            cur = []
        else:
            cur.append(l)
    if any(x.strip() for x in cur):
        chunks.append(cur)
    return chunks


def _directives(lines):
    d, body = {}, []
    for l in lines:
        s = l.strip()
        if not s:
            continue
        m = DIRECTIVE.match(s)
        if m:
            d[m["k"].lower()] = m["v"].strip()
        else:
            body.append(s)
    return d, body


def _slide(body, d, first):
    m = re.match(r"^title\s*:\s*(.+)$", body[0], re.I)
    if m:
        return {"type": "cover", "title": "\n".join([m[1].strip()] + body[1:]), "tape": d.get("tape")}
    m = re.match(r"^cta\s*:\s*(.+)$", body[0], re.I)
    if m:
        p = [x.strip() or None for x in m[1].split("|")] + [None, None]
        return {"type": "cta", "heading": p[0], "button": p[1], "goto": p[2]}
    has_list = any(BULLET.match(x) for x in body[1:])
    if first and not has_list and not (d.keys() - {"tape"} - DECK_KEYS):
        return {"type": "cover", "title": "\n".join(body), "tape": d.get("tape")}
    return _content(body, d)


def _content(body, d):
    head, rest = HEAD_PREFIX.sub("", body[0]).strip(), body[1:]
    if len(head) > MAX_HEADING and not rest:  # long single line: first sentence becomes the heading
        a = SENTENCE.split(head, maxsplit=1)
        if len(a) == 2 and len(a[0]) <= MAX_HEADING:
            head, rest = a[0], [a[1]]
    blocks = []
    for line in rest:
        m = BULLET.match(line)
        if not m:
            blocks.append({"p": line})
            continue
        style = "check" if m["m"] in CHECKS else "bullet"
        if blocks and blocks[-1].get("style") == style and "list" in blocks[-1]:
            blocks[-1]["list"].append(m["t"].strip())
        else:
            blocks.append({"list": [m["t"].strip()], "style": style})
    layout = d.get("layout", "").lower() or None
    if layout and layout not in LAYOUTS:
        raise ValueError(f"@layout must be one of {sorted(LAYOUTS)}, got {layout!r} (slide: {head!r})")
    lead = int(d["lead"]) if d.get("lead", "").isdigit() else None
    return {"type": "content", "heading": head, "blocks": blocks, "layout": layout,
            "media": _media(d, head), "lead": lead}


def _items(rest: str):
    items = []
    for part in rest.split(","):
        m = re.match(r"^\s*(\d+(?:\.\d+)?)\s*%?\s*(.*?)\s*$", part)
        if not m:
            raise ValueError(f"Chart data should look like '74 Label, 14 Label' — got {part!r}")
        items.append({"v": float(m[1]), "label": m[2]})
    return items


def _media(d, head):
    if d.get("phone") is not None and "media" not in d and "image" not in d:
        return {"kind": "phone", "src": d["phone"] or None}
    if "image" in d:
        return {"kind": "image", "src": d["image"], "frame": d.get("frame")}
    v = d.get("media")
    if not v:
        return None
    kind, _, rest = v.partition(" ")
    kind, rest = kind.lower(), rest.strip()
    if kind == "folder":
        label, _, tab = rest.partition("|")
        return {"kind": "folder", "label": label.strip() or "CHECKLIST", "tab": tab.strip()}
    if kind in ("chart", "donut", "bars"):
        return {"kind": "bars" if kind == "bars" else "donut", "items": _items(rest)}
    if kind == "orbs":
        return {"kind": "orbs", "items": [x.strip() for x in rest.split("|") if x.strip()]}
    if kind == "phone":
        return {"kind": "phone", "src": rest or None}
    if kind == "image":
        return {"kind": "image", "src": rest, "frame": d.get("frame")}
    raise ValueError(f"Unknown @media kind {kind!r} on slide {head!r} (folder, chart, bars, orbs, phone, image)")


FORMAT = """Output ONLY this plain-text format, nothing else:

Title: a short cover hook, wrap 1-2 key phrases like ==this==
---
Slide heading (max 8 words)
One or two short sentences.
- optional list item (use "✓ item" for a checklist)
@media: folder LABEL | TAB   (optional; also: orbs A | B | C | phone | chart 60 Label, 40 Label | bars ...)
---
CTA: closing line | button text | site

Rules: one idea per slide. No emojis. Never invent numbers, prices, discounts, awards, customers or
testimonials: use only the facts given. Only use a chart if the given facts contain the numbers."""

COMMAND_PROMPT = """You write marketing carousel copy for the brand below. Follow the user's request.

Brand: {name}
What it sells: {description}
Audience: {audience}
Tone: {tone}
Facts you may use (nothing else may be stated as fact):
{facts}

User request: {command}

Use {n} slides including the cover and the closing CTA. A good flow is: hook, problem, solution, 2-3 specifics, offer or next step, CTA.
""" + FORMAT


def _clean(raw: str) -> str:
    """LLMs add fences or a preamble; keep only the carousel text."""
    raw = "\n".join(l for l in raw.splitlines() if not l.strip().startswith("```"))
    m = re.search(r"^\s*title\s*:", raw, re.I | re.M)
    return raw[m.start():] if m else raw


def command_prompt(command: str, brand: dict, slides: int = 7) -> str:
    prod = brand.get("product", {})
    facts = "\n".join(f"- {f}" for f in prod.get("facts", [])) or "- (none given: keep claims generic)"
    return COMMAND_PROMPT.format(name=brand.get("name", ""), description=prod.get("description") or "(not given)",
                                 audience=prod.get("audience") or "(not given)", tone=prod.get("tone", "clear and friendly"),
                                 facts=facts, command=command.strip(), n=slides)


def outline_from_command(command: str, brand: dict, llm: Callable[[str], str], *, slides: int = 7) -> dict:
    """The only non-deterministic step: `llm` is any callable str -> str. Its reply goes through the same
    deterministic parser as pasted text."""
    return parse_text(_clean(llm(command_prompt(command, brand, slides))))


# ---------------- deterministic topic mode: no model, no key ----------------
CMD_PREFIX = re.compile(r"^\s*(?:please\s+)?(?:make|create|generate|write|build)\s+(?:me\s+)?(?:an?\s+)?(?:linkedin\s+)?"
                        r"(?:carousel|post)s?\s+(?:about|on|for|of)\s+", re.I)


def topic_from_command(text: str) -> str:
    """'make a carousel about our cold brew' -> 'our cold brew' (plain regex, no AI)."""
    return CMD_PREFIX.sub("", text.strip()).strip(" .") or text.strip()


def _title(topic: str) -> str:
    w = topic.split()
    w[0] = w[0][:1].upper() + w[0][1:]
    if len(w) == 1:
        return f"=={w[0]}=="
    if len(w) == 2:
        return f"=={' '.join(w)}=="
    if len(w) == 3:
        return f"{w[0]} ==" + " ".join(w[1:]) + "=="
    return f"=={w[0]}== " + " ".join(w[1:-2]) + f" =={' '.join(w[-2:])}=="


def _point(p):
    if isinstance(p, str):
        head, _, detail = p.partition(":")
        p = {"heading": head.strip(), "detail": detail.strip()} if detail else {"heading": p.strip()}
    blocks = [{"p": p["detail"]}] if p.get("detail") else []
    if p.get("items"):
        blocks.append({"list": list(p["items"]), "style": p.get("style", "check")})
    media = _media({"media": p["media"]}, p["heading"]) if p.get("media") else None
    return {"type": "content", "heading": p["heading"], "blocks": blocks, "layout": p.get("layout"), "media": media, "lead": None}


def deck_from_topic(topic: str, brand: dict, *, max_slides: int = 8) -> dict:
    """Topic + the user's product profile -> deck, by fixed rules. Nothing is invented: every slide
    comes from `product.points` (one slide each) or `product.facts` (checklist slides of up to 4)."""
    prod = brand.get("product", {})
    topic = topic_from_command(topic)
    slides = [{"type": "cover", "title": _title(topic), "tape": None}]
    if prod.get("points"):
        slides += [_point(x) for x in prod["points"]]
    elif prod.get("facts"):
        facts = list(prod["facts"])
        for i in range(0, len(facts), 4):
            slides.append({"type": "content", "heading": prod.get("facts_heading", "What you get") if i == 0 else "And more",
                           "blocks": [{"list": facts[i:i + 4], "style": "check"}], "layout": None, "media": None, "lead": None})
    else:
        raise ValueError("Topic mode needs the product's `points` or `facts` in the brand profile (nothing is invented). "
                         "Add them, or paste your own copy instead.")
    slides = slides[:max_slides - 1]
    slides.append({"type": "cta", "heading": brand["cta"].get("heading") or f"Ready to try {brand['name']}?", "button": None, "goto": None})
    return {"slides": slides, "overrides": {}}
