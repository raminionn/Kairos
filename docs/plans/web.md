# Kairos Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Kairos web app in `web/`: the landing page and one feed-style workspace for video, product and carousel, running on a fake API until the real one exists.

**Architecture:** Next.js App Router app. Pages are thin; features live in `web/features/<name>/`. All data goes through `features/jobs/api.ts`, whose base URL is `NEXT_PUBLIC_API_URL ?? "/api/mock"`. The fake API is a set of route handlers over a pure, unit-tested store in `web/mock/`.

**Tech Stack:** Next.js 16.4.x, React, TypeScript, Tailwind (version that `create-next-app` installs), GSAP 3.15 + ScrollTrigger (landing only), Vitest 5.

**Spec:** `docs/specs/2026-11-23-web-design.md`. Mockups: `docs/specs/2026-11-23-web-landing-mock.html`, `docs/specs/2026-11-23-web-workspace-mock.html`.

## Global Constraints

- Before writing Next.js code, read the docs bundled in `web/node_modules/next/dist/docs/` (or the version's docs). Next 16 APIs differ from older versions (for example async `params`).
- Font: Archivo via `next/font/google`, variable `wdth` axis; headlines `font-stretch: 112%`, light weight.
- Colours: page `#fbfbf7`, ink `#0c0c0c`, violet `#4b0fc8`, button violet `#5b12f5`, pink `#f05bb5`, yellow `#fbd431`, orange `#f27a2e`, periwinkle `#6f7ee0`, pass `#16a34a`, fail `#dc2626`.
- Module colours: video = violet, product = pink, carousel = yellow.
- Poll every 2 s while a job is `queued` or `running`. No websockets.
- Product categories: `fashion | app | product | packaging`. Variants 1–4, default 3.
- Upload types: video `mp4, mov, mkv, webm`; image `jpg, jpeg, png, webp`.
- Every animation respects `prefers-reduced-motion`.
- Pages must work at 1440 px and 390 px wide.
- New npm dependencies only: `gsap`, `vitest`. Nothing else without asking.
- Never edit `contracts/`, `fixtures/`, `shared/`, `api/`.
- Commits: Conventional Commits, subject ≤ 50 chars, body says why, **no Claude co-author trailer**. Multi-line messages via a file and `git commit -F <file>` (PowerShell 5.1: no `&&`).
- Each task's check before commit: `npm run lint`, `npx tsc --noEmit`, `npm test` (from Task 3), `npm run build`, all run in `web/`.

## Review Focus

- Wrong file type or a missing required field in the prompt bar: inline error under the bar, no job created. Test in Task 3 (`validateCreate`) and Task 5.
- API unreachable or 5xx while polling: the feed keeps the last data, shows a small banner "Can't reach the server. Retrying…", keeps polling. Test in Task 3 (`api.ts` error path).
- Product variant with empty `path`: grey tile "Generation failed" with its fail reasons, never a broken `<img>`. Test in Task 5.
- Check value `null`: that row is hidden; `app` shows only the screen (`ssim`) row. Test in Task 5 (`visibleChecks`).
- Job with `status: "failed"`: its row shows a red chip with `job.error`, no shimmer tiles. Test in Task 3 (store can make a failed job) and checked by screenshot in Task 4.

---

### Task 1: Scaffold the app

**Files:**
- Create: `web/` via `create-next-app` (TypeScript, ESLint, Tailwind, App Router, no `src/`, alias `@/*`)
- Modify: `web/app/layout.tsx`, `web/app/globals.css`, `web/app/page.tsx` (placeholder "Kairos")
- Delete: `web/.gitkeep`, starter assets in `web/public/` that nothing uses

**Interfaces:**
- Produces: Tailwind colour tokens `bg-page text-ink bg-violet bg-violet2 bg-pink bg-yellow bg-orange bg-peri text-pass text-fail`; CSS variable `--font-archivo`; class `font-wide` (`font-stretch:112%`).

- [ ] **Step 1:** Run `npx create-next-app@16.4.6 web --ts --eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-npm` from the repo root. If `web/` must be empty first, remove `web/.gitkeep`.
- [ ] **Step 2:** Read `web/node_modules/next/dist/docs/` index (or `AGENTS.md` if `create-next-app` wrote one) for fonts, route handlers and `params`.
- [ ] **Step 3:** Load Archivo in `layout.tsx` with `next/font/google` (`axes: ["wdth"]`), set `<html lang="en">`, body classes `bg-page text-ink`. Define the colour tokens and `font-wide` in `globals.css`.
- [ ] **Step 4:** Run the check commands (lint, tsc, build). Expected: all pass.
- [ ] **Step 5:** Commit `chore(web): scaffold Next.js app`.

### Task 2: Landing page

**Files:**
- Create: `web/features/landing/components/art.tsx` (SVG defs + named art parts: `ArtDefs`, `Phone`, `Jar`, `Slides`, `Clap`, `Mic`, `Film`, `Scissors`, `LensBall`)
- Create: `web/features/landing/components/{nav,hero,analytics,modules,insights,faq,cta}.tsx`
- Create: `web/features/landing/landing.tsx` (client component, owns all GSAP setup)
- Modify: `web/app/page.tsx` → renders `<Landing />`

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: nothing later tasks import. Links: "Upload a Video" and card 01 → `/video`; "Try Product Photos" and card 02 → `/product`; card 03 → `/carousel`; nav "Jobs" → `/jobs`; "New Job" → `/video`.

- [ ] **Step 1:** `npm i gsap@3.15.1` in `web/`.
- [ ] **Step 2:** Port the mock section by section (spec section 6, "Landing"). Copy text, sizes and art from `docs/specs/2026-11-23-web-landing-mock.html`. Remove its `?y=` debug hook. GSAP runs in one `useEffect` inside `gsap.context()` and reverts on unmount; `gsap.matchMedia()` turns the pin and scrubs off below 900 px and under `prefers-reduced-motion`.
- [ ] **Step 3:** Run `npm run dev`; screenshot at scroll positions 0, 1400, 2800, 4500, 6400 at 1440×900 and 0, 1200 at 390×844 with `node <scratchpad>/cdp-shots.mjs` (exists in the session scratchpad; copy it if missing). Expected: matches the mock screenshots; no console errors; no horizontal scroll at 390.
- [ ] **Step 4:** Run the check commands. Expected: pass.
- [ ] **Step 5:** Commit `feat(web): add landing page`.

### Task 3: API types, fake API, jobs client, `/jobs`

**Files:**
- Create: `web/lib/api-types.ts`
- Create: `web/mock/store.ts`, `web/mock/validate.ts`, `web/mock/data.ts` (fixture copies), `web/mock/placeholder.ts` (SVG generator)
- Create: `web/app/api/mock/jobs/route.ts` (GET list), `web/app/api/mock/jobs/[id]/route.ts` (GET one; POST create where `id` is the kind), `web/app/api/mock/jobs/[id]/outputs/route.ts`, `web/app/api/mock/files/[job]/[...path]/route.ts`
- Create: `web/features/jobs/api.ts`, `web/features/jobs/use-job-feed.ts`, `web/app/jobs/page.tsx`
- Test: `web/mock/store.test.ts`, `web/mock/validate.test.ts`, `web/features/jobs/api.test.ts`
- Modify: `web/package.json` (`"test": "vitest run"`)

**Interfaces:**
- Produces (`lib/api-types.ts`):
  ```ts
  type JobKind = "video" | "product" | "carousel";
  type JobStatus = "queued" | "running" | "done" | "failed";
  interface Job { id: string; kind: JobKind; status: JobStatus; stage: string | null; progress: number;
    error: string | null; created_at: string; updated_at: string; input: Record<string, unknown> }
  type Category = "fashion" | "app" | "product" | "packaging";
  interface Checks { ocr_cer: number|null; dino_sim: number|null; delta_e: number|null; silhouette_iou: number|null; ssim: number|null }
  interface ProductMeta { category: Category; attempts: number; repaired: boolean; passed: boolean; checks: Checks; fail_reasons: string[] }
  interface ClipMeta { rank: number; start: number; end: number; title: string; hook_text: string; suggested_caption: string;
    scores: { hook: number; self_containment: number; emotional_peak: number; pacing: number; retention_risk: number; genre_fit: number };
    signals: { words_per_sec: number; audio_energy: number; cut_count: number }; total: number; reasons: string[]; thumb_url: string }
  interface CarouselMeta { slides: string[] }
  type Output = { id: string; job_id: string; url: string } & (
    { kind: "clip"; meta: ClipMeta } | { kind: "product_image"; meta: ProductMeta } | { kind: "carousel_pdf"; meta: CarouselMeta });
  ```
  `input.name` (string) is the uploaded file name or carousel topic; the UI shows it as the row title.
- Produces (`mock/store.ts`): `createJob(kind: JobKind, input: Record<string, unknown>, now?: number): Job`, `jobAt(job: Job, now: number): Job` (pure), `listJobs(now: number): Job[]`, `getJob(id: string, now: number): Job | undefined`, `outputsFor(job: Job): Output[]`, `STAGES: Record<JobKind, string[]>`, `RUN_MS = 8000`. A job whose `input.name` contains `"fail"` ends `failed` with `error: "Mock failure"` (lets the UI show failed rows).
- Produces (`mock/validate.ts`): `validateCreate(kind: JobKind, form: FormData): { ok: true; input: Record<string, unknown> } | { ok: false; error: string }`.
- Produces (`features/jobs/api.ts`): `API_BASE`, `class ApiError extends Error { status: number }`, `listJobs(): Promise<Job[]>`, `getOutputs(id: string): Promise<Output[]>`, `createJob(kind: JobKind, form: FormData): Promise<Job>`, `fileUrl(url: string): string`.
- Produces (`features/jobs/use-job-feed.ts`): `useJobFeed(kind?: JobKind): { jobs: Job[]; outputs: Record<string, Output[]>; offline: boolean; submit(form: FormData): Promise<{ error?: string }> }`. Polls `listJobs` every 2 s while any job is queued/running (and once on mount); loads outputs once per job when it becomes `done`; on fetch error keeps last data and sets `offline: true` until the next success.

- [ ] **Step 1: Write failing tests.**
  `store.test.ts`: `jobAt` at +0 ms → `queued`, progress 0; at +4000 → `running`, progress between 1 and 99, `stage` is one of `STAGES[kind]`; at +`RUN_MS` → `done`, progress 100; a job with `input.name: "fail.mp4"` at +`RUN_MS` → `failed`, `error: "Mock failure"`; `outputsFor` of a done product job returns `n_variants` outputs of kind `product_image`, and one seeded variant has `url: ""` (empty path case); `outputsFor` of a running job returns `[]`.
  `validate.test.ts`: video `a.txt` → error `"Video must be mp4, mov, mkv or webm."`; video `a.MP4` → ok; product without category → `"Pick a category."`; product `n_variants=5` → `"Variants must be 1 to 4."`; product `a.gif` → `"Image must be jpg, png or webp."`; carousel with no topic, text or source_job_id → `"Add a topic, text or a source video."`.
  `api.test.ts` (mock `fetch`): 500 with `{detail:"boom"}` → `listJobs` rejects with `ApiError` status 500, message `"boom"`; network `TypeError` → rejects with `ApiError` status 0.
- [ ] **Step 2:** `npm i -D vitest@5.1.1`; run `npm test`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the files above. Fixture data: product from `fixtures/product.result.json` (3 variants: pass, fail with `fail_reasons: ["ocr_cer"]`, empty `path`), video from the `clips.json` example in system design section 7 (6 clips), carousel 5 hand-written slides. Placeholder files are SVGs (colour block + label) so nothing binary is committed. Seed one done job per kind at module load.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** `/jobs` page: table of `useJobFeed()` jobs: module colour dot, `input.name`, status chip, progress bar, relative created time; row links to `/<kind>/<id>`. Empty state: "No jobs yet. Start one from Video, Product or Carousel."
- [ ] **Step 6:** Run the check commands; open `/jobs` in dev. Expected: 3 seeded jobs listed.
- [ ] **Step 7:** Commit `feat(web): add fake API and jobs list`.

### Task 4: Workspace shell

**Files:**
- Create: `web/features/workspace/components/{rail,top-bar,feed,batch-row,tile-shimmer,drawer,prompt-bar}.tsx`
- Create: `web/features/workspace/workspace.tsx`

**Interfaces:**
- Consumes: `useJobFeed`, `Job`, `Output`.
- Produces:
  ```ts
  interface ModuleConfig {
    kind: JobKind; title: string;
    renderTile(o: Output, selected: boolean): ReactNode;
    renderDrawer(o: Output): ReactNode;
    promptFields: ReactNode;               // module inputs inside the bar (all named form fields)
    filter?(o: Output, f: "all" | "passed" | "failed"): boolean;   // presence turns the filter on
    expectedCount(job: Job): number;       // number of tiles; shimmer fills the gap while running
  }
  function Workspace(props: { module: ModuleConfig; openJobId?: string }): JSX.Element
  ```
  `PromptBar` wraps `promptFields` in a `<form>`, submits `FormData` through `submit`, shows the returned `error` under the bar, and disables Generate while sending.

- [ ] **Step 1:** Build the layout from spec section 6 "Workspace" and `docs/specs/2026-11-23-web-workspace-mock.html` option B: rail (active module highlighted, pink dot when that module has a running job), feed (newest first, row header: source thumb, `input.name`, settings, status chip; failed row shows red chip with `job.error`), docked prompt bar, right drawer (empty text "Select a result to see its details."). `openJobId` scrolls to that row. `offline` shows the banner text from Review Focus. Below 900 px the drawer becomes a bottom sheet and the rail becomes a bottom tab bar.
- [ ] **Step 2:** Temporary check page is not needed; Task 5 is the first consumer. Run tsc and lint. Expected: pass.
- [ ] **Step 3:** Commit `feat(web): add workspace shell`.

### Task 5: Product workspace

**Files:**
- Create: `web/lib/thresholds.ts`, `web/features/product/components/{product-tile,product-drawer,product-fields}.tsx`, `web/features/product/module.tsx`
- Create: `web/app/product/[[...id]]/page.tsx`
- Test: `web/lib/thresholds.test.ts`

**Interfaces:**
- Produces (`lib/thresholds.ts`): `type CheckName = keyof Checks`; `THRESHOLDS` copied from `product/config.yaml` on branch `feat/product-spec` (comment names that file); `checkPasses(category: Category, name: CheckName, value: number): boolean`; `visibleChecks(category: Category, checks: Checks): { name: CheckName; label: string; value: number; pass: boolean; tick: number }[]` (drops `null` values and checks with no threshold for that category). Labels: `ocr_cer` "Label text", `dino_sim` "Look", `delta_e` "Colour (ΔE)", `silhouette_iou` "Shape", `ssim` "Screen".
- Produces (`features/product/module.tsx`): `productModule: ModuleConfig`.

- [ ] **Step 1: Failing tests** in `thresholds.test.ts`: `checkPasses("product","ocr_cer",0.04)` → true; `("product","ocr_cer",0.2)` → false; `("product","dino_sim",0.91)` → true; `("fashion","delta_e",9.5)` → true; `("product","delta_e",9.5)` → false; `visibleChecks("app", {ocr_cer:null,dino_sim:null,delta_e:null,silhouette_iou:null,ssim:0.93})` → one row, name `ssim`, pass true; `visibleChecks("product", {ocr_cer:null,dino_sim:0.9,delta_e:3,silhouette_iou:0.9,ssim:null})` → 3 rows, no `ocr_cer`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `thresholds.ts`. Run `npm test`. Expected: PASS.
- [ ] **Step 4:** Build the module: fields (`file` input accept `.jpg,.jpeg,.png,.webp`, `props` text, `category` pill select, `n_variants` 1–4 default 3; selected photo shows as thumb with remove ×), tile (4:5 image, pass/fail badge; empty `url` → grey "Generation failed" tile with `fail_reasons`), drawer (image, status, attempts, repaired, `visibleChecks` meters with threshold tick, fail reasons, Download link, Regenerate button disabled with title "Coming when the API supports it"), filter All/Passed/Failed on `meta.passed`, `expectedCount` = `input.n_variants`.
- [ ] **Step 5:** Page `app/product/[[...id]]/page.tsx` renders `<Workspace module={productModule} openJobId={id} />` (await `params` per Next 16).
- [ ] **Step 6:** In dev: submit a `.gif` → inline error; submit a png with category → new row shimmers, then 3 tiles after ~8 s; click the failed tile → drawer shows red "Label text" row; empty-path tile shows "Generation failed". Screenshot at 1440 and 390.
- [ ] **Step 7:** Run the check commands. Expected: pass. Commit `feat(web): add product workspace`.

### Task 6: Video workspace

**Files:**
- Create: `web/features/video/components/{clip-tile,clip-drawer,video-fields}.tsx`, `web/features/video/module.tsx`, `web/app/video/[[...id]]/page.tsx`

**Interfaces:**
- Consumes: `Workspace`, `ModuleConfig`, `ClipMeta`.
- Produces: `videoModule: ModuleConfig`.

- [ ] **Step 1:** Fields: `file` accept `.mp4,.mov,.mkv,.webm`. Tile: 9:16 `meta.thumb_url`, rank badge `#n`, total as `0.81`. Drawer: `<video controls src={fileUrl(url)}>` (placeholder in mock shows the thumb as poster), title, hook text, suggested caption with Copy button, six score bars 1–10 (`retention_risk` labelled "Retention risk (lower is better)"), signals, reasons list. Tiles sorted by `rank`. No filter. `expectedCount` = 6 while running (mock), real count when done.
- [ ] **Step 2:** In dev: seeded video row shows 6 ranked tiles; drawer shows scores and reasons; upload `a.txt` → inline error. Screenshot at 1440 and 390.
- [ ] **Step 3:** Run the check commands. Commit `feat(web): add video workspace`.

### Task 7: Carousel workspace

**Files:**
- Create: `web/features/carousel/components/{carousel-tile,carousel-drawer,carousel-fields}.tsx`, `web/features/carousel/module.tsx`, `web/app/carousel/[[...id]]/page.tsx`

**Interfaces:**
- Consumes: `Workspace`, `ModuleConfig`, `CarouselMeta`, `listJobs` (for done video jobs).
- Produces: `carouselModule: ModuleConfig`.

- [ ] **Step 1:** Fields: `topic` text, optional `text` textarea, optional `source_job_id` select of done video jobs. Tile: first slide (4:5) + "5 slides". Drawer: slide viewer with prev/next and `n / total`, Download PDF link. A note in the drawer: "Carousel templates are not final yet." `expectedCount` = 1.
- [ ] **Step 2:** In dev: create from a topic → row → tile → drawer pages through 5 slides; empty submit → inline error. Screenshot at 1440 and 390.
- [ ] **Step 3:** Run the check commands. Commit `feat(web): add carousel workspace`.
