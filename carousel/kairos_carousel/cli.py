from __future__ import annotations

import argparse
import sys
import json
from pathlib import Path

from .pipeline import build_carousel, build_from_brief, build_from_command, build_from_topic


def main(argv=None) -> int:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    ap = argparse.ArgumentParser(prog="kairos_carousel", description="Pasted text -> LinkedIn carousel PDF (no AI in the renderer).")
    ap.add_argument("input", nargs="?", help="slide copy (.txt/.md), a deck .json, or - for stdin")
    ap.add_argument("--serve", action="store_true", help="open the form app in your browser (http://127.0.0.1:8765)")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--brief", help="a brief .json (what the form produces) -> carousel")
    ap.add_argument("--topic", help="topic or command, e.g. \"carousel about our cold brew\" (no AI, no key; uses product points/facts from --brand)")
    ap.add_argument("--command", help="OPTIONAL: let a language model write the copy (needs ANTHROPIC_API_KEY)")
    ap.add_argument("--brand", help="brand JSON (name, handle, site, colours, avatar...)")
    ap.add_argument("--out", default="out", help="output folder (default: out)")
    ap.add_argument("--no-png", action="store_true", help="skip per-slide PNGs")
    ap.add_argument("--force", action="store_true", help="export even if the layout guard reports errors")
    a = ap.parse_args(argv)
    if a.serve:
        from .webapp import serve
        serve(a.port)
        return 0
    if not (a.input or a.topic or a.command or a.brief):
        ap.error("use --serve for the form, or give --brief FILE, an input file or --topic")
    try:
        if a.brief:
            rep = build_from_brief(json.loads(Path(a.brief).read_text(encoding="utf-8")), a.out, png=not a.no_png, force=a.force)
        elif a.topic:
            rep = build_from_topic(a.topic, a.brand, a.out, png=not a.no_png, force=a.force)
        elif a.command:
            from .llm import anthropic_llm
            rep = build_from_command(a.command, a.brand, anthropic_llm(), a.out, png=not a.no_png, force=a.force)
        else:
            src = sys.stdin.read() if a.input == "-" else Path(a.input)
            rep = build_carousel(src, a.brand, a.out, png=not a.no_png, force=a.force)
    except (ValueError, FileNotFoundError, ImportError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    print(rep.summary())
    if rep.files.get("pdf"):
        print(f"\nPDF: {rep.files['pdf']}")
    if rep.errors and not rep.exported:
        print("\nNothing exported: fix the errors above or re-run with --force.", file=sys.stderr)
    return 1 if rep.errors else 0
