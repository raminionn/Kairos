# Kairos Web UI: Design

Status: draft for Ahmad's approval. Date: 2026-11-23. Owner: Ahmad (`web/`).
Agrees with `docs/specs/2026-11-17-kairos-system-design.md` sections 7, 8, 10 and 11.

## 1. Intent

One web app for the whole Kairos MVP. It has two jobs:

- **Showcase:** a landing page that makes a strong first impression in demos.
- **Testing as we build:** a workspace where each module (video, product, carousel) is used and its
  results are inspected, first against fake data, then against the real API when it exists.

## 2. Goals, non-goals, anti-goals

Goals
- Landing page that replicates the approved reference (Wollo Dribbble shot) in layout, type and
  motion, with Kairos content and Kairos-themed art.
- One workspace pattern for all three modules, so a user learns it once.
- Works today with no backend: a fake API in `web/` returns fixture data and fake job progress.
- Switch to the real API by changing one environment variable. No component changes.
- Show every product image with its gate checks. No generated output reaches the user without its
  check result (system design anti-goal).

Non-goals (not now)
- Accounts, login, pricing, sharing links. ("Jobs" and "New Job" replace the reference's "Log in"
  and "Start Free Trial".)
- Real uploads before the real API exists. The fake API accepts the form and ignores the file.
- Websockets. The UI polls every 2 s (system design).
- Infinite canvas, pan, zoom (considered and rejected, section 4).

Anti-goals (a failure even if it works)
- A confusing workspace. Ahmad's words: "relatable, less confusing, more clean".
- Hand-written API types that drift from the real API after it exists.
- Animations that block use: the workspace must feel instant.

## 3. Constraints

- Flat repo layout; `web/` is Ahmad's. The fake API lives only in `web/`.
- Next.js App Router, TypeScript, Tailwind (system design section 11). Read the installed Next.js
  version's docs before coding; APIs change between majors.
- `contracts/`, `fixtures/`, `shared/` changes need all three reviewers. The web build does not
  change them; it copies the fixture data it needs into `web/`.
- Windows, flaky network: keep new npm dependencies few.
- Team rules: branch `feat/web-ui`, Conventional Commits, no Claude co-author trailer, commit after
  each task that passes its check.

## 4. Approaches

### Workspace layout
| | Approach | Trade-off | Decision |
|---|---|---|---|
| A | Canvas workspace like Figma: inputs left, dot-grid canvas, inspector right | Good for side-by-side compare; pan/zoom is extra work and adds little for clips | Rejected as base; its inspector is kept |
| B | Generation feed like Higgsfield / Imagine.art: runs as batches, prompt bar docked at bottom, detail drawer right | Matches "generate, then check"; keeps history; works for clips and slides too | **Chosen**, with A's inspector in the drawer |

### Fake data until the API exists
| | Approach | Trade-off | Decision |
|---|---|---|---|
| 1 | Next.js route handlers in `web/app/api/mock/` mirroring section 8 routes | Stays in Ahmad's folder, no new tools; mock code is thrown away later | **Chosen** |
| 2 | MSW (service worker) | No mock routes in the app; new library and harder to debug | Rejected |
| 3 | FastAPI mock in `api/` | Most real; breaks folder ownership (Adina's) | Rejected |

## 5. Look and feel (decided)

- Font: Archivo (Google Fonts, variable width), headlines light and wide (`font-stretch ~112%`).
- Colours: page `#fbfbf7`, ink `#0c0c0c`, violet `#4b0fc8`, button violet `#5b12f5`, pink `#f05bb5`,
  yellow `#fbd431`, orange `#f27a2e`, periwinkle `#6f7ee0`. Pass green `#16a34a`, fail red `#dc2626`.
- Module colours (used for dots and accents): video = violet, product = pink, carousel = yellow.
- Art: flat shapes with grain and halftone dots, Kairos objects only (phone playing a captioned clip,
  filmstrip and scissors, ranked clip cards, waveform, score gauge, product jar with check, slide
  stack, podcast mic, clapperboard). Inline SVG, no image files.
- Reference mockups (approved): `docs/specs/2026-11-23-web-landing-mock.html` (landing, motion and
  art) and `docs/specs/2026-11-23-web-workspace-mock.html` (workspace option B with A's inspector).

## 6. Pages and routes

```
/                      landing (marketing)
/jobs                  all jobs, newest first: module dot, name, status chip, progress, created
/video                 video workspace   (feed of video jobs + prompt bar + drawer)
/video/[id]            same workspace, that job's row opened and scrolled to
/product, /product/[id]       product workspace
/carousel, /carousel/[id]     carousel workspace
```

System design section 11 lists `video/new` and `video/[id]`. Here "new" is the prompt bar at the
bottom of `/video`, so no separate `new` route. **Change to section 11; tell the team.**

### Landing (`/`)
Port of the approved mock, section by section:
1. Hero: headline, "Upload a Video" (to `/video`) and "Try Product Photos" (to `/product`), tilted
   yellow / pink / violet card stack with lens and hanging phone.
2. Pinned scroll scene: violet card grows to full screen, nav turns to its dark state, the camera
   pans down the scene, then the next section slides up over it.
3. "Every Clip, Scored and Explained": auto-advancing tabs (topics, score bars, retention curve)
   with progress bars; ranking chart with time pills and count-up stats.
4. "Modules": big word with yellow marquee pill; three numbered cards (01 video, 02 product,
   03 carousel) that rise at different speeds and link to their workspace.
5. Big text reveal, then three stat rows with tilted tags and count-up numbers (placeholder numbers,
   marked as such in code).
6. FAQ with native `<details>`.
7. CTA card and footer.

Motion: GSAP + ScrollTrigger for 2, 3, 4, 5; CSS for small loops. Everything respects
`prefers-reduced-motion`. Mobile (< 900 px): no pin, sections stack, nav pills hide.

### Workspace (`/video`, `/product`, `/carousel`)

```
+----+--------------------------------------------------+-------------+
|rail| top bar: module name        [All|Passed|Failed]  |  drawer     |
| J  |--------------------------------------------------|  (selected  |
| V  | batch row: source thumb · name · settings · chip |   output)   |
| P  |   [tile][tile][tile][shimmer]                    |             |
| C  | batch row ...                                    |  preview    |
|    |                                                  |  facts      |
|    |   +--------- prompt bar (docked) ----------+     |  checks     |
|    |   | [file] text / props                    |     |  actions    |
|    |   | [pill][pill]                 Generate  |     |             |
+----+--------------------------------------------------+-------------+
```

- Rail: Jobs, Video, Product, Carousel; a pink dot on a module that has a running job.
- Feed: one batch row per job, newest at top. Tiles appear as outputs arrive; missing ones shimmer
  with the job's `stage` text ("checking label…").
- Drawer: opens when a tile is clicked; shows the big preview and module-specific details.
  Empty state: "Select a result to see its details."
- Filter (All / Passed / Failed): product only. Video and carousel show "All" only.

Per module:

| | Prompt bar inputs | Tile | Drawer |
|---|---|---|---|
| Video | video file (mp4/mov/mkv/webm) | 9:16 thumbnail, rank badge, total score | player, title, hook text, suggested caption, six rubric score bars, signals, reasons |
| Product | image (jpg/png/webp), props text, category pill (fashion/app/product/packaging), variants pill (1–4, default 3) | 4:5 image, pass/fail badge | image, status, attempts, repaired, checks with threshold ticks, fail reasons, Download, Regenerate (disabled until the API supports it) |
| Carousel | topic or text, or pick a finished video job as source; template pill | first slide, slide count | slide viewer (prev/next), PDF download |

Product check rows (only those not `null`): label text `ocr_cer` (lower is better), look `dino_sim`,
colour `delta_e` (lower is better), shape `silhouette_iou`, screen `ssim` (app only). Threshold ticks
come from a copy of `product/config.yaml` thresholds in `web/lib/thresholds.ts` with a comment that
names the source file. **Upgrade path:** the API puts thresholds in `meta`.

Variant with empty `path` (generation failed on every attempt): grey tile "Generation failed" plus its
fail reasons. (Open item from the product handoff.)

Video carousel source and carousel templates are not designed yet by the carousel owner; the
carousel workspace shows fixture data only until that spec exists.

## 7. Data flow

```
component -> features/jobs/api.ts (fetch, base = NEXT_PUBLIC_API_URL ?? "/api/mock")
          -> mock route handlers (now)  |  FastAPI (later)
poll GET /jobs/{id} every 2 s while status is queued|running; then GET /jobs/{id}/outputs
```

API routes and shapes follow system design section 8, with `POST /jobs/product` fields
`file`, `category`, `props`, `n_variants` (product spec 5.8).

Types (`web/lib/api-types.ts`): `Job`, `Output` from section 7; `meta` typed per output kind:
- `clip`: one clip object from `clips.json` (section 7).
- `product_image`: `Variant` fields from `contracts/product.py` (`attempts`, `repaired`, `passed`,
  `checks`, `fail_reasons`) plus `category`.
- `carousel_pdf`: `{ slides: string[] }` (slide image URLs). **Assumed**; replace when the carousel
  spec defines it.

These types are hand-written now. When the FastAPI app exists, replace the file with
`openapi-typescript` output and fix compile errors. That is the only planned rework.

### Fake API (`web/app/api/mock/`)
- Same paths as section 8 under `/api/mock`.
- State: an in-memory list of jobs (module scope), seeded with one done job per module.
- `POST`: validates the form (file type and required fields, as the real API will), creates a job
  that moves queued → running (stages from the module flow) → done over about 8 s, computed from
  `created_at` on each read (no timers).
- Outputs: built from fixture data copied into `web/mock/` (product from `fixtures/product.result.json`,
  video from the section 7 `clips.json` example, carousel hand-written). Media are SVG placeholders
  generated in code, so no binary files are committed.
- Removed when the real API exists (delete the folder, unset nothing).

## 8. File structure

```
web/
  app/
    layout.tsx  globals.css
    page.tsx                         # landing
    jobs/page.tsx
    video/[[...id]]/page.tsx  product/[[...id]]/page.tsx  carousel/[[...id]]/page.tsx
    api/mock/jobs/...                # fake API route handlers
  features/
    landing/components/              # hero, scene, analytics, modules, stats, faq, cta, art.tsx
    workspace/components/            # rail, feed, batch row, tile, drawer, prompt bar (shared)
    jobs/api.ts  jobs/use-job.ts     # fetch + polling
    video/components/  product/components/  carousel/components/   # module tiles, drawers, prompt fields
  lib/api-types.ts  lib/thresholds.ts
  mock/                              # fixture data for the fake API
  components/ui/                     # button, chip, pill, meter (only when used twice)
```

## 9. Verification

- `npm run lint`, `tsc --noEmit`, `npm run build` pass before each commit.
- Unit tests only for logic: fake job progression and threshold pass/fail (Vitest, one small file
  each).
- UI checks by running the app and taking screenshots at 1440 px and 390 px (desktop and mobile).

## 10. Build order (each step ends in a commit)

1. Scaffold Next.js app, fonts, colours, Tailwind theme.
2. Landing page (port of the mock).
3. Types + fake API + jobs polling + `/jobs`.
4. Workspace shell (rail, feed, drawer, prompt bar).
5. Product workspace (first, because its backend exists).
6. Video workspace.
7. Carousel workspace (fixture data only).

## 11. Left to the builder

- Exact component split inside each feature folder.
- Mock timing and stage names per module.
- How the landing port shares the SVG art (one `art.tsx` with named components is the default).

## 12. Calls made by Claude (check these)

- No separate `new` routes; the prompt bar replaces them (change to section 11).
- Mock media are generated SVG placeholders, not committed images.
- Landing stats are placeholders until real eval numbers exist.
- Thresholds copied into `web/lib/thresholds.ts` until the API sends them.
- Product prompt bar has no aspect-ratio or gate pills (the mock had them; the backend does not
  support them).
- Carousel output `meta` shape is assumed.
