# Kairos: System Design and Repo Structure

Status: draft for team review (Ahmad, Rameen, Adina). Date: 2026-11-17.

## 1. Intent

Kairos turns one long video into ranked, captioned, vertical short clips (core), plus two
standalone modules: product photos and LinkedIn carousels (thumbnails later). This document fixes
how the pieces connect and the file formats between people, so three people can build in parallel
without blocking each other.

## 2. Goals, non-goals, anti-goals

Goals
- Each pipeline stage runs on its own from the command line: file in, file out.
- Each person can build against a fake input file today and swap in the real one later.
- One shared layer (database, storage, queue, LLM client) written once, used by every module.
- Every stage has an evaluation script in `eval/` from the start.

Non-goals (not built now)
- User accounts, login, payments, pricing tiers.
- Cloud object storage, production deployment, autoscaling.
- Live progress over websockets (polling is enough).

Anti-goals (would make this a failure even if it works)
- A stage that can only run inside the full pipeline.
- Two people editing the same file to integrate.
- Generated output reaching the user without its check (fidelity gate, OCR, layout guard).
- An LLM writing HTML or free-form output where a schema fits.

## 3. Approaches considered

| | Approach | Trade-off | Decision |
|---|---|---|---|
| A | One repo, one folder per stage, connected by shared file contracts | Formats must be agreed early | **Chosen** |
| B | Separate service per stage, talking over HTTP | Independent deploys, but 5 services, network failures, heavy local setup | Rejected: too heavy for 3 people |
| C | Loose per-person folders, integrate at the end | Fastest start, painful late merge, formats drift | Rejected: delays the main risk |

## 4. Repo structure

```
Kairos/
  contracts/        # Pydantic models for every file passed between people        (shared)
  fixtures/         # example JSON for each contract, hand-written until real ones exist
  understanding/    # ingest, ASR, router, vision path, genre, shot boundaries     (Rameen)
  decision/         # candidates, judge, rank, dedup                               (Ahmad)
  render/           # cut, vertical crop, captions                                 (Adina)
  api/              # FastAPI app, queue worker, database                          (Adina)
  product/          # product photo module, standalone                             (Ahmad)
  carousel/         # LinkedIn carousel module, standalone                         (Ahmad)
  shared/           # LLM client, storage paths                                    (shared)
  web/              # Next.js frontend                                             (Ahmad)
  eval/             # one subfolder per stage/module; datasets git-ignored
  docs/specs/  docs/plans/
```

Python: one `pyproject.toml` at the repo root; each top-level folder is a package
(`import decision`, `from shared.llm import complete_json`).

Rule: a folder has one owner. `contracts/`, `fixtures/` and `shared/` are touched by more than one
person; changes there need a PR reviewed by everyone.

## 5. Stage interface

Every stage exposes one function and one CLI with the same shape:

```python
def run(input_path: Path, output_path: Path, config: StageConfig) -> None: ...
```
```
python -m decision fixtures/understanding.podcast.json out/clips.json
```

- Input and output are validated against the Pydantic model in `contracts/` on read and write.
  A bad file fails at the boundary with a clear error, not three stages later.
- Stages do not import each other. The worker in `api/` is the only code that knows the order.
- Stages do not touch the database. The worker records status and outputs.

## 6. Data flow

```
upload
  -> api: create job row, save file to data/jobs/<job_id>/source.mp4, enqueue
  -> worker (in api/):
       understanding -> source.wav, meta.json, understanding.json
       decision      -> clips.json
       render        -> clips/<clip_id>.mp4, clips/<clip_id>.jpg
     after each stage: update job.stage, job.progress
  -> web polls GET /jobs/<id> every 2 s, then lists outputs
```

Product photos and carousels use the same path with their own single-stage job.

### Job folder

```
data/jobs/<job_id>/
  source.mp4  source.wav  meta.json
  understanding.json  clips.json
  clips/<clip_id>.mp4  clips/<clip_id>.jpg  clips/<clip_id>.ass
```

A failed stage can be re-run from the files already in the folder without repeating earlier stages.

## 7. File contracts (first draft; Rameen owns the final understanding.json)

### understanding.json

```json
{
  "version": 1,
  "video": { "id": "abc123", "duration": 2412.5, "fps": 30, "width": 1920, "height": 1080 },
  "route": "speech",
  "route_reason": { "speech_ratio": 0.82, "avg_confidence": 0.91 },
  "genre": { "label": "podcast", "confidence": 0.87 },
  "language": "en",
  "segments": [
    {
      "start": 12.40, "end": 18.95, "source": "asr",
      "text": "So the first thing nobody tells you about funding...",
      "words": [ { "w": "So", "start": 12.40, "end": 12.55, "conf": 0.98 } ]
    }
  ],
  "shots": [ { "start": 0.0, "end": 14.2 } ]
}
```

- `route`: `"speech"` or `"visual"`. On the visual path, `source` is `"vlm"`, `text` is the frame
  description, and `words` is `null`.
- `genre.label`: one of `podcast | lecture | interview | vlog | gaming`.
- `shots`: PySceneDetect boundaries, computed in `understanding/` (decided). It already decodes the
  video for frame sampling, and both decision (cut snapping) and render (cut points) read the
  result, so it belongs upstream of both.

### clips.json

```json
{
  "version": 1,
  "video_id": "abc123",
  "genre": "podcast",
  "clips": [
    {
      "id": "c01",
      "rank": 1,
      "start": 312.10, "end": 356.80,
      "title": "Why most first funding rounds fail",
      "hook_text": "Nobody tells you this about funding",
      "suggested_caption": "The one mistake every first-time founder makes #startups",
      "scores": {
        "hook": 8, "self_containment": 9, "emotional_peak": 6,
        "pacing": 7, "retention_risk": 3, "genre_fit": 8
      },
      "signals": { "words_per_sec": 2.9, "audio_energy": 0.64, "cut_count": 2 },
      "total": 0.81,
      "reasons": [
        "Opens with an open question in the first 3 seconds",
        "Complete argument, no reference to earlier context"
      ]
    }
  ]
}
```

- Scores are 1–10 with anchored levels defined in the rubric file. `retention_risk` is inverted when
  computing `total` (higher risk lowers the total).
- `total` is 0–1, computed by code from per-genre weights. It is never produced by the LLM.
- Render needs only `id`, `start`, `end`, `rank`. Everything else is for the UI and evaluation.

### Jobs (api <-> web)

`Job`: `id, kind (video | product | carousel), status (queued | running | done | failed), stage,
progress (0–100), error, created_at, updated_at`.
`Output`: `id, job_id, kind (clip | product_image | carousel_pdf | thumbnail), url, meta (json)`.

## 8. Shared layer

| Concern | Choice | Reason |
|---|---|---|
| Language | Python 3.12, one root `pyproject.toml`, `uv` | One environment, fast installs |
| Models / validation | Pydantic v2 | Same models validate files, API bodies and LLM output |
| API | FastAPI | Proposal choice; OpenAPI for free |
| Queue | Redis + RQ | Simplest Redis queue; retries and job status built in. Celery is more than needed |
| Database | PostgreSQL + SQLAlchemy 2 + Alembic | Proposal choice; migrations tracked in git |
| Storage | Local `data/jobs/<id>/` | Object storage later, behind `shared/storage.py` path functions only |
| LLM + VLM | `openai` SDK against any OpenAI-compatible endpoint: OpenRouter, OpenAI, or Gemini's OpenAI-compatible endpoint. `shared/llm.py`: `complete_json(task, messages, schema)` | Config maps each task (judge, candidate finder, VLM, copy planner) to `{provider, model}`; each provider is `{base_url, api_key_env}`. Switching between OpenRouter and a direct key is a config change, not a code change. Retries, temperature 0 and a disk cache keyed by model + prompt hash live here |
| Frontend types | `openapi-typescript` from FastAPI's OpenAPI | Frontend types never hand-written |

Example LLM config:

```yaml
providers:
  openrouter: { base_url: https://openrouter.ai/api/v1, api_key_env: OPENROUTER_API_KEY }
  gemini:     { base_url: https://generativelanguage.googleapis.com/v1beta/openai/, api_key_env: GEMINI_API_KEY }
  openai:     { base_url: https://api.openai.com/v1, api_key_env: OPENAI_API_KEY }
tasks:
  judge: { provider: gemini, model: <tbd> }
  vlm:   { provider: openrouter, model: <tbd> }
```

Only models that reliably follow a JSON schema are used for structured tasks.

### Database tables (two)

- `jobs`: as above, plus `input` (json) and `job_dir`.
- `outputs`: as above. Clip scores and reasons live in `meta`; full detail stays in `clips.json`.

No per-module tables until a module needs to query a field. JSON in `meta` covers the rest.

### API (Adina owns; mock first)

```
POST /jobs/video          multipart file                    -> Job
POST /jobs/product        multipart file + style + props    -> Job
POST /jobs/carousel       {topic | text | source_job_id, template, brand} -> Job
GET  /jobs                                                   -> Job[]
GET  /jobs/{id}                                              -> Job
GET  /jobs/{id}/outputs                                      -> Output[]
GET  /files/{job_id}/{path}                                  -> file
```

Mock mode (`KAIROS_MOCK=1`): same routes, returns fixture jobs that move from queued to done over a
few seconds, with outputs pointing at sample files. The frontend builds against this from day one.

### Validation boundaries

- API: upload size and type checked (video: mp4/mov/mkv/webm, image: jpg/png/webp), request bodies
  via Pydantic.
- Stage boundaries: every file read/written through its contract model.
- LLM output: parsed into a Pydantic model; invalid output retried once, then the candidate is
  dropped and logged.
- File serving: `/files` resolves paths inside the job folder only (no `..`).

## 9. Decision stage (Ahmad) in brief

1. Load `understanding.json`, pick the genre profile (criteria text, rubric weights, clip length range).
2. Candidates: LLM reads the transcript in windows and proposes `start, end, why`; code snaps
   boundaries to sentence ends (word timings) and shot boundaries, and drops out-of-range lengths.
3. Signals: words per second, audio energy (from `source.wav`), cut count. Computed by code.
4. Judge: LLM scores each candidate on the six rubric items, temperature 0, with reasons.
5. Total = per-genre weighted sum of normalised scores and signals.
6. Pairwise re-rank of the top candidates (both orders, to cancel position bias).
7. Dedup: drop temporal overlap above a threshold and near-duplicate text; return top N.

Evaluation (`eval/decision/`): Kendall's tau and Spearman's rho vs reference importance on TVSum/SumMe
and hand-labelled genre samples; judge test–retest agreement across runs.

## 10. Standalone modules

Each gets its own short spec in `docs/specs/` before it is built. Placement is fixed now:

| | product/ (Ahmad) | carousel/ (Ahmad) | thumbnails (Adina, later) |
|---|---|---|---|
| Job kind | `product` | `carousel` | tbd |
| Endpoint | `POST /jobs/product` | `POST /jobs/carousel` (can take `source_job_id` to reuse a video transcript) | tbd |
| Output kind | `product_image` (fidelity scores + pass/fail in `meta`) | `carousel_pdf` | `thumbnail` |
| Web routes | `product/new`, `product/[id]` | `carousel/new`, `carousel/[id]` | tbd |
| Eval | `eval/product/` | `eval/carousel/` | `eval/thumbnails/` |

Flow outlines:
- Product photos: input photo + style -> VLM product record -> 3 generated variants -> fidelity gate
  (OCR CER on label, DINOv2 similarity, CIELAB colour difference, silhouette) -> repair or regenerate,
  max 2 retries -> variants with pass/fail badge.
- Carousel: topic/text/transcript -> LLM slide plan (fixed schema, word limits) -> Jinja into one of
  3 HTML templates at 1080x1350 -> Playwright layout guard (overflow, contrast) -> PNGs -> PDF.

Left for the module specs: image model and provider; the 5 product style presets and gate
thresholds; where the heavy check models (DINOv2, BiRefNet, IC-Light, PaddleOCR) run (GPU or not);
the 3 carousel templates and slide schema; where a brand kit is stored without user accounts.

## 11. Frontend (Ahmad)

Next.js (App Router, TypeScript, Tailwind) in `web/`, organised by feature:

```
web/
  app/                       # routes only
    page.tsx                 # job list
    video/new/  video/[id]/
    product/new/  product/[id]/
    carousel/new/  carousel/[id]/
  features/
    jobs/        components/ api.ts       # polling, status, outputs
    video/       components/              # upload, clip cards with score + reasons, player
    product/     components/
    carousel/    components/
  lib/api-types.ts           # generated from OpenAPI
  components/ui/
```

Check the installed Next.js version's docs before writing code; APIs change between majors.

## 12. Working rules

- Everyone works in their own folder on their own branch; PRs into `main`, no direct commits.
- Branch names: `feat/<area>-<slug>`, `fix/<area>-<slug>`, `chore/<slug>` (e.g. `feat/decision-judge`).
- Changes to `contracts/`, `fixtures/` or `shared/`: PR reviewed by all three.
- Fixture files are the source of truth until real outputs exist; when a real output appears, it
  replaces the fixture in the same PR.
- `data/`, `models/` and media files are git-ignored (already in `.gitignore`).

## 13. Open questions for the team

1. **Image model** for product photos and thumbnails. Text and vision models go through the shared
   client (decided); image generation may need a separate provider. Decide in the product spec.
2. **Video-by-link**: allow YouTube links in v1, or upload only? Recommendation: upload only in v1.
   Adding a `url` field later changes no file contract.

## 14. Calls to review

- RQ over Celery; two tables with JSON `meta`; polling over websockets; local storage only.
- `total` computed by code, never by the LLM.
- Stages never touch the database; only the worker does.
- Shot boundaries computed in `understanding/`.
- Worker lives in `api/` (Rameen's layout puts backend, queue and database together).
