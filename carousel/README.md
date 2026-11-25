# kairos_carousel

> Lives in `carousel/`. Run every command below from inside that folder (`cd carousel`).

Deterministic carousel maker for Kairos. A user fills in a form about **their own product** and gets a complete, postable LinkedIn carousel PDF.
**No AI and no API key anywhere in the default path.** Same input, same output. Every slide is built only from what the user typed.

```
form fields (brief) -> slides by fixed rules -> HTML/CSS -> layout guard (overflow + contrast) -> PDF + PNGs
```

## Setup (Windows, PowerShell)
```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m playwright install chromium
```
Fonts are bundled (`python fetch_fonts.py` only if a "font not bundled" warning appears).

## 1. Use the form
```
python -m kairos_carousel --serve
```
Opens http://127.0.0.1:8765 . Fill in:
1. **Product**: name, handle, website, brand colour, logo upload. "Save this product" stores it, so the next carousel for the same product is one pick away.
2. **Carousel**: topic (becomes the cover), goal (launch / tips / offer / explain), optional problem sentence.
3. **Key points** (1 to 5, one slide each), optional **steps** (+ product screenshot in a phone frame), optional **numbers** (bar chart), optional **offer**, optional closing line and button text.

Click *Create carousel*: you get the PDF to download (upload it to LinkedIn as a document) and slide previews. Files are kept in `carousel_output/`, saved products in `profiles/`.

The logo, colour, handle and site come from the product, so switching product changes them everywhere. Topic and points change every content slide.

## 2. Or build from a brief file
```
python -m kairos_carousel --brief examples/brief_northfield.json --out out
python -m kairos_carousel --brief examples/brief_flowdesk.json --out out2
```
Brief fields: `brand{name, handle, site, primary, logo}`, `topic`, `goal`, `hook` (cover override, `==word==` highlights), `problem`, `points[{heading, detail, items[]}]`, `steps[]`, `screenshot`, `stats[{value,label}]` + `stats_unit`, `offer`, `cta{heading, button}`. `logo` and `screenshot` can be a file path or a data URI.

From Python (e.g. inside the Kairos backend):
```python
from kairos_carousel import build_from_brief
rep = build_from_brief(brief_dict, "out")     # rep.files["pdf"], rep.summary(), rep.errors
```

## How slides are assembled
cover (topic) -> "Sound familiar?" (problem) -> "At a glance" (your point headings: orbs if all are short, otherwise a checklist with a folder graphic) -> one slide per point -> "How it works" (steps + phone) -> "By the numbers" (bars) -> "The offer" -> closing slide. A slide appears only if you filled in its fields. The goal only changes the cover label, folder label and the default closing line/button.

Limits and validation: logo/screenshot are checked and shrunk (PNG/JPG/WebP, 4 MB max); colour must be `#rrggbb`; at most 5 points and 5 steps; at least one point, step or offer is required. Errors come back as plain messages.

## Layout guard
Measures every rendered slide in Chromium.
- **Fixed automatically:** text too big for its slide steps down 100% -> 70%; cover decorations that would cover text move to a free spot or are hidden.
- **Errors (nothing exported):** text still overflowing at 70%, collisions with header/footer, other text or media, media squeezed under 260px, chart labels cut off, WCAG AA contrast failures (4.5:1; 3:1 for large text on the 1080px canvas).
- **Warnings:** text on an image/gradient (contrast unverifiable), fonts not bundled.

## Brand colour
`primary` derives the cover, accent and highlight colours. Colours are darkened until white text on them reaches WCAG AA, so any brand colour works. Orange folder / violet bookmark are swapped only if the brand colour is close to them.

## Other entry points
- Pasted copy in the `--` format: `python -m kairos_carousel examples/coffee.txt --brand brands/northfield.json`
- `--topic` uses `product.points` / `product.facts` from a brand JSON.
- Optional, not needed: `build_from_command` / `--command` lets a language model write the copy (needs `ANTHROPIC_API_KEY`, untested against the live API).

## Known limits
- The reference's 3D stock art (coins, hands, tree rings) can't be reproduced without AI. The built-in folder, orbs, phone frame, bar chart and your own screenshot fill those slots.
- Slides with a single sentence are shown as a large centred statement. Richer slides need more detail in the form (checklist items, steps, numbers).
