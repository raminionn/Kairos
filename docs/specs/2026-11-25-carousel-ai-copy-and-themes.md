# Carousel: AI copy and design themes

Status: draft. Date: 2026-11-25. Owners: Ahmad (AI copy step, `web/`), Adina (`carousel/` templates; themes need her OK).

## Flow (chosen: A)

```
summary + brand -> AI writes brief JSON (schema, limits) -> user edits point rows -> kairos_carousel renders -> layout guard -> PDF
```

The AI only writes words into a fixed schema. Layout, contrast and fit stay with Adina's
deterministic maker and its guard. One retry when the JSON breaks a rule; then show the error.

## 1. Copy prompt (system prompt, used as is)

```
You write LinkedIn carousel copy. You return ONLY JSON that matches the schema. No prose, no markdown.

Use only facts from the user's summary. Never invent numbers, customers, awards, prices or claims.
If the summary has no numbers, leave "stats" empty. If unsure, say less.

Structure (one idea per slide):
- topic: the promise of the carousel in plain words, 3 to 8 words.
- hook: the cover title, max 60 characters. A clear benefit, a surprising fact from the summary,
  or a "how to" for a specific reader. Mark 1 or 2 key words with ==word==.
  No clickbait, no questions that can be answered "no", no emojis.
- problem: one sentence the reader recognises from their own work, max 140 characters.
- points: 3 to 5 items, in a logical order (steps, or most important first).
  heading: max 60 characters, starts with a verb or a number, no full stop.
  detail: one or two short sentences, max 160 characters, concrete (what to do, or why it matters).
- stats: 0 to 4 items {value: number, label: max 24 characters}, only from the summary.
- cta: heading max 60 characters; button max 24 characters ("Follow for more", "Save this post",
  "Book a demo"). One action only.

Style: plain English at a level a 14-year-old understands. Active voice. Short words. Second person ("you").
No jargon, no hashtags, no emojis, no ALL CAPS, no exclamation marks, no "unlock", "elevate",
"game-changer", "in today's fast-paced world". Same tone in every slide.
```

Schema (matches `kairos_carousel` brief, tighter than its hard limits 80/220 so the guard rarely shrinks text):

```json
{ "topic": "str", "hook": "str", "problem": "str",
  "points": [{"heading": "str", "detail": "str"}],
  "stats": [{"value": 0, "label": "str"}],
  "cta": {"heading": "str", "button": "str"} }
```

Model: through OpenRouter (key already in `.env`), JSON mode, temperature 0.3. Choice of model: decide
when building (a fast, cheap text model is enough).

## 2. LinkedIn design rules (for every theme)

Canvas
- Portrait 1080 x 1350 px (4:5). Export as one PDF. 5 to 10 slides works best; the maker gives 5 to 9.
- Safe margin: 96 px on all sides (about 9%). LinkedIn's mobile viewer overlays page arrows and the
  page count near the edges; nothing important goes outside the safe area.
- Keep a 64 px band at the bottom for the footer (logo, handle, "Save for later"); body text never enters it.

Type
- At most 2 typefaces: one display (headlines), one sans-serif (body). Bundle them (offline).
- Sizes at 1080 px wide: cover title 88 to 110 px; slide heading 56 to 72 px; body 34 to 40 px;
  footer 24 to 28 px. Nothing under 24 px: carousels are read on phones.
- Line length max about 28 characters for headings, 40 for body. Left-aligned body text.
- Line height 1.1 for headlines, 1.35 for body.

Colour and contrast
- One brand colour plus neutrals. Text contrast WCAG AA (4.5:1, 3:1 for text 54 px and larger):
  already enforced by the layout guard.
- Never put body text on a photo without a solid or 80%-opaque panel behind it.

Slide rules
- One idea per slide. Max about 40 words per slide.
- Cover: the hook is the biggest element; brand and a "swipe" cue visible.
- Same position for heading, body and footer on every content slide (readers scan, they do not read).
- Last slide: one call to action.

## 3. Themes from inspiration

References (2026-11-25, kept out of git): four sets from Canva / Pinterest. Adina's current design already
follows one of them (notepad cover, folder, "Save for later" footer); it becomes "Editorial".
Proposed new themes (same slide structure and brief, different CSS and decorations):

| Theme | Look | `==word==` emphasis | Fonts (free, bundled) |
|---|---|---|---|
| Editorial | current design | marker box | Playfair Display + Inter (current) |
| Midnight | near-black, thin light headline, "Swipe" pill, author pill, huge faded number bottom-right | bold weight | Poppins (300 + 700) |
| Notebook | cream grid paper, paperclip label tag, hand-drawn arrow, "•••" footer cue | hand-drawn circle | DM Sans |
| Bold Numbers | light or lime ground, heavy condensed caps, huge "01 →" numbers, "→" bullets, accent quote line | highlighter box | Anton or Archivo Black + Inter |

Shared by all: header row (series label left, site or handle right), footer (avatar + name left, save cue
right), section 2 margins and sizes. The brand colour becomes the accent (circle, highlighter, numbers).
Style is reproduced, never the reference artwork: decorations are our own simple SVG shapes.
Every theme must pass section 2 and the existing layout guard.
Needs Adina's agreement, because `carousel/` is her folder.

## 4. UI changes (Ahmad, `web/`)
- Summary box + brand name/colour + "Write with AI" button -> fills editable point rows (heading and
  detail with live character counts), hook, problem, stats, CTA.
- "More options": logo upload, handle, website, steps with screenshot, offer.
- Theme picker once themes exist.
