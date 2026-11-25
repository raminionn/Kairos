"""Blocks numbers the user never supplied (invented stats, prices, discounts) from reaching a marketing carousel."""
from __future__ import annotations

import re

NUM = re.compile(r"[$€£]?\d[\d,]*(?:\.\d+)?\s*(?:%|x\b|k\b|m\b)?", re.I)


def _norm(tok: str) -> str:
    return re.sub(r"[\s,]", "", tok.lower())


def _risky(tok: str) -> bool:
    """Structural counts like '3 steps' are fine; percentages, money, decimals and numbers above 10 are claims."""
    n = _norm(tok)
    if any(c in n for c in "%$€£.") or n[-1:] in "xkm":
        return True
    digits = re.sub(r"\D", "", n)
    return bool(digits) and int(digits) > 10


def _texts(deck):
    for i, s in enumerate(deck["slides"], 1):
        parts = [s.get("title", ""), s.get("heading", ""), s.get("tape", "") or ""]
        for b in s.get("blocks", []):
            parts += [b["p"]] if "p" in b else b["list"]
        m = s.get("media") or {}
        for it in m.get("items", []) if isinstance(m.get("items"), list) else []:
            if isinstance(it, dict):
                parts += [f"{it['v']:g}", f"{it['v']:g}%", it.get("label", "")]
            else:
                parts.append(str(it))
        parts += [m.get("label", ""), m.get("tab", "")]
        yield i, " ".join(p for p in parts if p)


def unverified_claims(deck: dict, allowed: str) -> list[tuple[int, str]]:
    ok = {_norm(t) for t in NUM.findall(allowed)}
    ok |= {n.rstrip("%") for n in ok}
    out = []
    for i, text in _texts(deck):
        for tok in NUM.findall(text):
            n = _norm(tok)
            if _risky(tok) and n not in ok and n.rstrip("%") not in ok:
                out.append((i, tok.strip()))
    return out
