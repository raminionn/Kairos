# Kairos

Long to short video pipeline, plus standalone product photo and LinkedIn carousel modules.

Design: [docs/specs/2026-11-17-kairos-system-design.md](docs/specs/2026-11-17-kairos-system-design.md)

Folders:
- contracts: file formats passed between layers
- fixtures: small example JSON files for each contract
- understanding: ingestion, speech to text, router, vision path, genre
- decision: clip selection, scoring, ranking
- render: cutting, vertical crop, captions
- api: backend, job queue, database
- web: frontend
- eval: evaluation scripts
- product: product photo module (standalone)
- carousel: LinkedIn carousel module (standalone)
- shared: code used by more than one folder (LLM client, storage paths)
- docs: specs and plans
