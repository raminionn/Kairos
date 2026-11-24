# Web: Local Runner (real pipelines without the API)

Status: draft for Ahmad's approval. Date: 2026-11-24. Owner: Ahmad (`web/`).

## Intent
Use the real Python stages from the UI now, before Adina's `api/` exists, on Ahmad's machine only.

## Goals / non-goals
- Goal: video upload runs Rameen's `understanding` for real; the UI shows its result.
- Goal: product upload runs `product` for real when that module is present.
- Non-goal: queue, database, multi-user, deployment. Those are `api/`'s job.
- Anti-goal: mixing real and fake results in one view without saying which is which.

## Approaches
| | Approach | Decision |
|---|---|---|
| A | Fake API spawns the real CLIs when `KAIROS_LOCAL=1` | **Chosen** (Ahmad) |
| B | Build FastAPI `api/` now | Rejected: Adina's folder, most work |
| C | Wait for the API | Rejected: no real runs for weeks |

## Design
- Switch: server env `KAIROS_LOCAL=1` (in `web/.env.local`). Off = today's mock, unchanged.
- Python: `KAIROS_PYTHON`, default `<repo>/.venv/Scripts/python.exe`. Repo root = `web/..`.
- Job folder: `data/jobs/<job_id>/` as in system design section 6. Upload saved as `source.<ext>`.
- Video: `python -m understanding.run data/jobs/<id>/source.<ext> --id <id> --out data/jobs/<id>`.
  Status comes from the process: running while alive; `done` when it exits 0 and
  `understanding.json` exists; `failed` with the last stderr line otherwise.
  Output: one `understanding` output (route, genre, language, duration, segments).
  The video workspace shows it as "Transcript" with the note "Clips appear when the decision
  stage is built." No mock clips are shown for local jobs.
- Product: only when `<repo>/product/` exists, else 422 "The product module is not on this branch."
  Writes `request.json` (contract `ProductRequest`), runs `python -m product request.json result.json`,
  maps `result.json` variants to `product_image` outputs.
- Carousel: stays mocked (no module yet).
- Files: in local mode `/files/<job>/<path>` reads from `data/jobs/<job>/`, path must stay inside that
  folder (no `..`). Upload limits: video 2 GB, image 20 MB.
- Types: `Output.kind` gains `"understanding"`. The real API needs the same kind; tell Adina.

## Verification
- Unit tests (Vitest): status from process state; path confinement; `understanding.json` to output mapping.
- Manual: upload `data/videos/test_talk.mp4` with `KAIROS_LOCAL=1`; the transcript shows in the UI.

## Left to the builder
Process bookkeeping details, the transcript panel layout.
