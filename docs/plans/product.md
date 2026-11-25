# Product Photo Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `product/`: a standalone CLI stage that turns one upload + category into 3 generated images, each checked by the fidelity gate (and repaired or regenerated) with scores and pass/fail written to `result.json`.

**Architecture:** File in, file out (`run(input_path, output_path, config)`). Image generation through the OpenRouter Image API with a disk cache. Gate = pure metric functions (unit-tested on synthetic images) plus thin GPU model wrappers (BiRefNet, DINOv2; RapidOCR on CPU) that load one at a time. Repair = paste the real cutout, then one relight pass through the same image model. `run.py` owns the retry loop.

**Tech Stack:** Python 3.12, uv, Pydantic v2, httpx, numpy, Pillow, opencv-python, scikit-image, torch (CUDA wheels), transformers, rapidocr (ONNX, CPU), pytest.

**Spec:** `docs/specs/2026-11-21-product-design.md`

## Global Constraints

- Stage rule: `product/` imports only `contracts`, its own modules and libraries. No DB, no `api/`, no other stage.
- Categories exactly: `fashion`, `app`, `product`, `packaging`.
- Accepted uploads: `.jpg .jpeg .png .webp`, max 20 MB.
- `max_retries: 2`, `n_variants: 3` (config values).
- Repair (paste + relight) only for `product` and `packaging`. `fashion` regenerates only. `app` uses the chroma screen paste.
- A variant that still fails after retries is written with `passed: false`. Never drop it, never mark it passed.
- Peak VRAM under 6 GB: one GPU model loaded at a time, fp16. RapidOCR on CPU.
- Light in every output comes from the template, never from the upload.
- API key from env `OPENROUTER_API_KEY` (loaded from `.env` by the CLI). Never logged.
- Generated images and caches go under `data/` (git-ignored).
- Commits: Conventional Commits, subject ≤ 50 chars, **no Claude co-author trailer, no "Generated with" footer** (team rule). PowerShell 5.1: no `&&`; multi-line messages via `git commit -F <scratchpad file>`.
- Tests live in `product/tests/`. Tests marked `gpu` (real models) or `api` (real OpenRouter) are deselected by default.

## Review Focus

1. Phone photo with EXIF rotation, or RGBA/greyscale PNG: load must apply `ImageOps.exif_transpose` and convert to RGB. Test in Task 2.
2. Upload with no readable text: `ocr_cer` is `null` and does not fail the variant. Test in Task 2 (`decide`) and Task 7.
3. Output image with a different size or aspect than the source: every metric must still work (crop + resize inside the metric). Test in Task 2.
4. OpenRouter free model returns 429, an empty `data` list, or bytes that are not an image: retry, then count as a failed attempt, never crash the job. Tests in Task 3 and Task 7.
5. `OPENROUTER_API_KEY` missing: clear error at the first call, exit code 1 from the CLI. Test in Task 3 and Task 7.

---

### Task 1: Project setup and contracts

**Files:**
- Create: `pyproject.toml` (root; shared file, so this PR needs all three reviewers)
- Create: `contracts/__init__.py`, `contracts/product.py`
- Create: `fixtures/product.request.json`, `fixtures/product.result.json`
- Create: `product/__init__.py`, `product/tests/__init__.py`, `product/tests/test_contracts.py`
- Delete: `contracts/.gitkeep`, `product/.gitkeep`

**Interfaces:**
- Produces (`contracts/product.py`):
  - `Category = Literal["fashion", "app", "product", "packaging"]`
  - `ProductRequest(version: Literal[1] = 1, category: Category, image: str, props: str | None = None, n_variants: int = Field(3, ge=1, le=4))`
  - `Checks(ocr_cer: float | None = None, dino_sim: float | None = None, delta_e: float | None = None, silhouette_iou: float | None = None, ssim: float | None = None)`
  - `Variant(id: str, path: str, attempts: int, repaired: bool, passed: bool, checks: Checks, fail_reasons: list[str])`
  - `ProductResult(version: Literal[1] = 1, category: Category, model: str, reference_text: str, variants: list[Variant])`
  - All models: `model_config = ConfigDict(extra="forbid")`.

- [ ] **Step 1: Write `pyproject.toml`**
  - `requires-python = ">=3.12"`; base deps: `pydantic>=2`, `python-dotenv`, `pyyaml`.
  - Optional extra `product`: `httpx`, `numpy`, `pillow`, `opencv-python`, `scikit-image`, `torch`, `torchvision`, `transformers`, `timm`, `kornia`, `einops` (BiRefNet remote code needs the last three), `rapidocr`, `onnxruntime`.
  - Dev group: `pytest`.
  - `[tool.uv.sources]` + `[[tool.uv.index]]`: torch/torchvision from `https://download.pytorch.org/whl/cu128` (`explicit = true`). The driver (621.x) supports CUDA 12.8.
  - `[tool.pytest.ini_options]`: `markers = ["gpu: needs real models", "api: calls OpenRouter"]`, `addopts = "-m 'not gpu and not api'"`.
  - `[tool.setuptools.packages.find]` (or hatch equivalent) so `contracts`, `product`, `eval` import from the root.

- [ ] **Step 2: Install**

Run: `uv python install 3.12; uv sync --extra product`
Expected: exits 0. Then `uv run python -c "import torch; print(torch.cuda.is_available())"` prints `True`.

- [ ] **Step 3: Write the failing test** `product/tests/test_contracts.py`

```python
def test_fixtures_validate():
    ProductRequest.model_validate_json(Path("fixtures/product.request.json").read_text())
    ProductResult.model_validate_json(Path("fixtures/product.result.json").read_text())

def test_unknown_category_rejected():
    with pytest.raises(ValidationError):
        ProductRequest(category="shoes", image="a.jpg")

def test_extra_field_rejected():
    with pytest.raises(ValidationError):
        ProductRequest(category="app", image="a.png", style="x")
```

- [ ] **Step 4: Run** `uv run pytest product/tests/test_contracts.py -v` — Expected: FAIL (import error).
- [ ] **Step 5: Implement the models above and the two fixtures** (copy the JSON from spec section 5.2).
- [ ] **Step 6: Run** `uv run pytest product/tests/test_contracts.py -v` — Expected: 3 passed.
- [ ] **Step 7: Commit** `git add pyproject.toml uv.lock contracts fixtures product; git commit -m "feat(product): add contracts and project setup"`

---

### Task 2: Pure gate metrics

**Files:**
- Create: `product/gate.py` (pure part only)
- Test: `product/tests/test_gate.py`

**Interfaces:**
- Consumes: `Checks` (Task 1).
- Produces (all images `np.ndarray` HxWx3 uint8 RGB, masks HxW bool):
  - `load_image(path: Path) -> np.ndarray` — `ImageOps.exif_transpose`, `.convert("RGB")`.
  - `crop(img: np.ndarray, mask: np.ndarray) -> np.ndarray` — bounding box of mask, outside-mask pixels set to white.
  - `cer(reference: str, hypothesis: str) -> float` — uppercase, collapse whitespace, Levenshtein distance / len(reference). Caller never passes an empty reference.
  - `delta_e(a: np.ndarray, mask_a: np.ndarray, b: np.ndarray, mask_b: np.ndarray) -> float` — mean CIELAB of each masked region (`skimage.color.rgb2lab`), then `deltaE_ciede2000` between the two means. (No pixel correspondence exists between images, so compare region means.)
  - `silhouette_iou(mask_a: np.ndarray, mask_b: np.ndarray) -> float` — crop each mask to its bbox, pad to a square around the centre (keeps aspect), resize to 256x256 nearest, IoU.
  - `decide(checks: Checks, thresholds: dict[str, float]) -> list[str]` — returns failed check names. Rules: `ocr_cer > ocr_cer_max`, `dino_sim < dino_sim_min`, `delta_e > delta_e_max`, `silhouette_iou < silhouette_iou_min`, `ssim < ssim_min`. A `None` check or a missing threshold key is skipped.

- [ ] **Step 1: Write the failing tests**

```python
def test_cer_identical_and_one_error():
    assert cer("ORGANIC HONEY", "organic  honey") == 0
    assert cer("HONEY", "HONFY") == pytest.approx(0.2)

def test_iou_ignores_position_and_scale():
    a = disk_mask(size=200, r=40, centre=(60, 60))
    b = disk_mask(size=600, r=120, centre=(400, 300))
    assert silhouette_iou(a, b) > 0.95

def test_iou_detects_shape_change():
    assert silhouette_iou(disk_mask(200, 40, (100, 100)), rect_mask(200, 40, 100)) < 0.85  # tall rect vs disk

def test_delta_e_same_colour_different_sizes():
    a, ma = solid((200, 0, 0), (100, 100)), full_mask((100, 100))
    b, mb = solid((200, 0, 0), (300, 500)), full_mask((300, 500))
    assert delta_e(a, ma, b, mb) < 0.5

def test_delta_e_red_vs_orange_is_large():
    assert delta_e(solid((200, 0, 0), (50, 50)), full_mask((50, 50)),
                   solid((230, 120, 0), (50, 50)), full_mask((50, 50))) > 8

def test_decide_skips_none_and_reports_failures():
    t = {"ocr_cer_max": 0.1, "dino_sim_min": 0.8, "delta_e_max": 8, "silhouette_iou_min": 0.85}
    assert decide(Checks(ocr_cer=None, dino_sim=0.9, delta_e=3, silhouette_iou=0.9), t) == []
    assert decide(Checks(dino_sim=0.9, delta_e=12, silhouette_iou=0.9), t) == ["delta_e"]

def test_load_image_exif_rotation_and_rgba(tmp_path):
    # save a 40x20 RGBA PNG -> shape (20, 40, 3); save a 40x20 JPEG with EXIF Orientation=6 -> shape (40, 20, 3)
    ...
```

Small helpers (`disk_mask`, `rect_mask`, `solid`, `full_mask`) live at the top of the test file.

- [ ] **Step 2: Run** `uv run pytest product/tests/test_gate.py -v` — Expected: FAIL (import error).
- [ ] **Step 3: Implement the functions above in `product/gate.py`.**
- [ ] **Step 4: Run** `uv run pytest product/tests/test_gate.py -v` — Expected: all passed.
- [ ] **Step 5: Commit** `git commit -m "feat(product): add gate metrics"`

---

### Task 3: OpenRouter image client

**Files:**
- Create: `product/generate.py`
- Test: `product/tests/test_generate.py`

**Interfaces:**
- Produces:
  - `class GenerationError(Exception)`
  - `generate_image(model: str, prompt: str, images: list[Path], key: str, cache_dir: Path, aspect_ratio: str | None = None, client: httpx.Client | None = None) -> bytes` — returns PNG/JPEG bytes of one image.
- Request: `POST https://openrouter.ai/api/v1/images`, header `Authorization: Bearer $OPENROUTER_API_KEY`, JSON `{"model", "prompt", "n": 1, "input_references": [{"type": "image_url", "image_url": {"url": "data:<mime>;base64,..."}}], "aspect_ratio"?}`. Response: `data[0].b64_json`.
- One call per variant (simpler than `n=3`; same cost). `key` (e.g. `"v1-a0"`) separates variants and attempts in the cache.
- Cache: file `cache_dir / f"{sha256(model, prompt, aspect_ratio, each image's bytes, key)}.img"`. Hit = no HTTP call.
- Retries: 429, 5xx, timeouts: 3 tries, sleep 2, 4, 8 s (sleep function injectable or patched in tests). Other 4xx: raise `GenerationError` at once with status and body text (no key in the message).
- Empty `data`, missing `b64_json`, or bytes that `PIL.Image.open(...).verify()` rejects: `GenerationError`.
- Missing env key: `GenerationError("OPENROUTER_API_KEY is not set")` before any request.

- [ ] **Step 1: Write the failing tests** (use `httpx.MockTransport`; `monkeypatch.setenv("OPENROUTER_API_KEY", "test")`)

```python
def test_returns_image_and_sends_reference(tmp_path): ...       # handler asserts input_references[0].image_url.url startswith "data:image/"
def test_cache_hit_makes_no_request(tmp_path): ...              # second call: handler call count stays 1
def test_retries_429_then_succeeds(tmp_path): ...               # 429, 429, 200 -> bytes; sleep patched
def test_400_raises_without_retry(tmp_path): ...                # 1 call, GenerationError
def test_non_image_bytes_raise(tmp_path): ...                   # b64 of b"hello" -> GenerationError
def test_empty_data_raises(tmp_path): ...                       # {"data": []}
def test_missing_key_raises(tmp_path, monkeypatch): ...         # delenv -> GenerationError, 0 calls
```

- [ ] **Step 2: Run** `uv run pytest product/tests/test_generate.py -v` — Expected: FAIL.
- [ ] **Step 3: Implement `generate_image`.**
- [ ] **Step 4: Run** — Expected: 7 passed.
- [ ] **Step 5: Add one `@pytest.mark.api` test** that calls a real model with a small generated image. Run it once by hand: `uv run pytest product/tests/test_generate.py -m api -v` — Expected: PASS and a cached file. Pick the model id from `GET https://openrouter.ai/api/v1/images/models` (check for free ones).
- [ ] **Step 6: Commit** `git commit -m "feat(product): add OpenRouter image client"`

---

### Task 4: App chroma screen paste

**Files:**
- Create: `product/repair.py` (screen part)
- Test: `product/tests/test_repair.py`

**Interfaces:**
- Produces:
  - `find_green_quad(img: np.ndarray) -> np.ndarray | None` — float32 (4, 2), order TL, TR, BR, BL. Pixels with G ≥ 200, R ≤ 80, B ≤ 80 (also accept HSV hue 50–70 °, high saturation, if the builder finds model greens drift); morphology close; largest contour; `cv2.approxPolyDP` to 4 points; `None` if not 4 points or area < 2 % of the image.
  - `paste_screen(img: np.ndarray, quad: np.ndarray, screenshot: np.ndarray) -> np.ndarray` — `getPerspectiveTransform` + `warpPerspective`, composite inside the quad (dilate the quad mask 2 px to cover the green edge).
  - `screen_ssim(img: np.ndarray, quad: np.ndarray, screenshot: np.ndarray) -> float` — warp the quad region back to screenshot size, greyscale SSIM (`skimage.metrics.structural_similarity`).

- [ ] **Step 1: Write the failing tests**

```python
def test_find_quad_on_tilted_green_screen():
    img, corners = scene_with_green_quad()   # grey 800x600 image, green polygon at known tilted corners
    q = find_green_quad(img)
    assert q is not None and np.abs(q - corners).max() <= 3

def test_no_green_returns_none():
    assert find_green_quad(np.full((600, 800, 3), 128, np.uint8)) is None

def test_paste_then_ssim_high_and_no_green_left():
    img, corners = scene_with_green_quad()
    shot = checkerboard_with_text(390, 844)
    out = paste_screen(img, corners, shot)
    assert screen_ssim(out, corners, shot) > 0.9
    assert find_green_quad(out) is None
```

- [ ] **Step 2: Run** `uv run pytest product/tests/test_repair.py -v` — Expected: FAIL.
- [ ] **Step 3: Implement the three functions.**
- [ ] **Step 4: Run** — Expected: 3 passed.
- [ ] **Step 5: Commit** `git commit -m "feat(product): add app screen paste"`

---

### Task 5: GPU model wrappers and `check_variant`

**Files:**
- Modify: `product/gate.py` (add model part)
- Test: `product/tests/test_gate_models.py` (all `@pytest.mark.gpu`)

**Interfaces:**
- Consumes: Task 2 functions.
- Produces:
  - `get_mask(img: np.ndarray) -> np.ndarray` — BiRefNet (`ZhengPeng7/BiRefNet`, `trust_remote_code=True`), input 1024x1024, sigmoid > 0.5, resized back to image size.
  - `read_text(img: np.ndarray) -> str` — RapidOCR on CPU (PP-OCR models), lines joined with a space, text with confidence < 0.5 dropped.
  - `dino_similarity(a: np.ndarray, b: np.ndarray) -> float` — `facebook/dinov2-base`, CLS embedding, cosine.
  - `check_variant(source: np.ndarray, source_mask: np.ndarray, reference_text: str, output: np.ndarray, thresholds: dict[str, float]) -> tuple[Checks, np.ndarray, list[str]]` — returns checks, the output mask, and `decide(...)`. `ocr_cer` is `None` when `reference_text` is empty. All crops via `crop()`.
- One-slot GPU cache inside `gate.py`: loading a GPU model first deletes the current one and calls `torch.cuda.empty_cache()`. Models run in fp16 on `cuda` if available, else fp32 on CPU.

- [ ] **Step 1: Write the gpu tests** on synthetic images (no binary fixtures):

```python
@pytest.mark.gpu
def test_mask_finds_red_disk_on_white(): ...                 # IoU with the true disk > 0.9
@pytest.mark.gpu
def test_read_text_reads_rendered_label(): ...               # PIL draws "ORGANIC HONEY" large; cer(...) < 0.1
@pytest.mark.gpu
def test_dino_same_image_high_different_low(): ...           # same > 0.95; disk vs checkerboard < 0.6
@pytest.mark.gpu
def test_check_variant_text_free_source_skips_ocr(): ...     # reference_text="" -> checks.ocr_cer is None
@pytest.mark.gpu
def test_peak_vram_under_6gb(): ...                          # run all three wrappers in sequence; torch.cuda.max_memory_allocated() < 5.5e9
```

- [ ] **Step 2: Run** `uv run pytest product/tests/test_gate_models.py -m gpu -v` — Expected: FAIL.
- [ ] **Step 3: Implement the wrappers and `check_variant`.**
- [ ] **Step 4: Run** — Expected: 5 passed. Also `uv run pytest` (default set) still passes.
- [ ] **Step 5: Commit** `git commit -m "feat(product): add gate model wrappers"`

---

### Task 6: Cutout paste

**Files:**
- Modify: `product/repair.py`
- Test: `product/tests/test_repair.py`

**Interfaces:**
- Produces:
  - `paste_cutout(source: np.ndarray, source_mask: np.ndarray, output: np.ndarray, output_mask: np.ndarray) -> np.ndarray` — crop source to its mask bbox, scale to fit inside the output mask bbox keeping aspect, centre it, alpha-blend with the source mask feathered by a 3 px Gaussian.
  - `RELIGHT_PROMPT = "Relight the product to match this scene's lighting and shadows. Do not change the product's shape, text, logo or colours."` — used by `run()` (Task 7) for the relight pass through `generate_image`. No local relight model.

- [ ] **Step 1: Failing test**

```python
def test_paste_cutout_lands_inside_output_box():
    # source: red disk on white; output: grey scene with a blue square mask at a different place and size
    out = paste_cutout(src, src_mask, scene, scene_mask)
    assert red pixels lie inside the scene_mask bbox, and the red area is > 50 % of that bbox
```

- [ ] **Step 2: Run, see FAIL; implement; run** `uv run pytest product/tests/test_repair.py -v` — Expected: all passed.
- [ ] **Step 3: Commit** `git commit -m "feat(product): add cutout paste repair"`

---

### Task 7: Templates, config, `run()` and CLI

**Files:**
- Create: `product/config.yaml` (copy spec 5.5; model ids from Task 3 step 5)
- Create: `product/templates/fashion.yaml`, `app.yaml`, `product.yaml`, `packaging.yaml`
- Create: `product/run.py`, `product/__main__.py`
- Test: `product/tests/test_run.py`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces:
  - `class ProductError(Exception)`
  - `load_config(path: Path = Path(__file__).parent / "config.yaml") -> dict`
  - `build_prompt(template: dict, props: str | None) -> str` — replaces `{props}`; empty props removes the placeholder and collapses whitespace.
  - `run(input_path: Path, output_path: Path, config: dict) -> None`
  - CLI: `python -m product <request.json> <result.json> [--config PATH]`; loads `.env`; prints the error and exits 1 on `ProductError` / `GenerationError`.
- Template files: keys `prompt`, `aspect_ratio`, optional `reference_image` (path relative to `templates/`). Ahmad gives the real prompts; until then each file holds a short working prompt marked `# placeholder: Ahmad replaces`. The `app` prompt must ask for a solid pure green `#00FF00` screen.
- `run()` flow (calls modules as `gate.x`, `generate.x`, `repair.x` so tests can monkeypatch):
  1. Validate request (contract), image suffix, size ≤ 20 MB, `load_image` opens it; else `ProductError`.
  2. Non-app: `source_mask = gate.get_mask(src)`; mask area < 1 % of image → `ProductError("no item found in the upload")`. `reference_text = gate.read_text(gate.crop(src, source_mask))`. App: no mask, `reference_text = ""`.
  3. For each variant `i` in `1..n_variants`: generate with `images = [source, source cutout on white (non-app only), template reference_image if set]`, `prompt = build_prompt(...)`, `model = config["models"][category]`, `aspect_ratio` from the template, `cache_dir = Path("data/cache/product")`, key `f"v{i}-a0"`; then check. On fail and `attempts <= max_retries`:
     - `product`/`packaging`, not yet repaired, `silhouette_iou >= repair_min` → `pasted = repair.paste_cutout(...)`, save it to a temp PNG, then `generate.generate_image(model, repair.RELIGHT_PROMPT, [pasted_png], key=f"v{i}-r{attempt}", ...)`, `repaired = True`, re-check. (Repair + relight counts as one attempt.)
     - else regenerate with key `f"v{i}-a{attempt}"`, re-check.
     - App: `find_green_quad` → `None` means fail reason `"no_screen"` and regenerate; else `paste_screen`, `ssim = screen_ssim(...)`, `decide`.
     - `GenerationError` on an attempt → fail reason `"generation_error"`, counts as an attempt.
  4. Write `output_path.parent / "variants" / f"v{i}.png"`, then `ProductResult` to `output_path` (paths relative to `output_path.parent`).

- [ ] **Step 1: Write the failing tests** (monkeypatch `generate.generate_image`, `gate.get_mask`, `gate.read_text`, `gate.check_variant` with fakes; real `paste_cutout`)

```python
def test_all_pass_first_try(job): ...                 # 3 variants, attempts == 1, passed, result validates
def test_repair_then_pass(job): ...                   # first check fails with iou 0.75 (>= repair_min 0.70) -> generate called with RELIGHT_PROMPT, key "v1-r1"; second check passes -> repaired True, attempts 2
def test_fashion_never_repairs(job): ...              # fail -> regenerate with key "v1-a1"; RELIGHT_PROMPT never sent
def test_still_failing_after_retries_is_kept(job): ...# always fails -> attempts == 3, passed False, fail_reasons non-empty, file exists
def test_generation_error_counts_as_attempt(job): ... # first call raises GenerationError, second ok -> attempts 2
def test_app_no_green_regenerates(job): ...           # first image has no green -> fail_reasons ["no_screen"], then pass
def test_no_item_found(job): ...                      # empty mask -> ProductError("no item found in the upload")
def test_bad_upload_type(job): ...                    # image "a.gif" -> ProductError
def test_build_prompt_props(): ...                    # with props and without; no "{props}" left
def test_cli_exit_code_on_missing_key(job, monkeypatch): ...  # delenv key, subprocess `python -m product` -> returncode 1, message names OPENROUTER_API_KEY
```

`job` fixture: tmp dir with a small generated `source.jpg` and `request.json`.

- [ ] **Step 2: Run** `uv run pytest product/tests/test_run.py -v` — Expected: FAIL.
- [ ] **Step 3: Implement config, templates, `run.py`, `__main__.py`.**
- [ ] **Step 4: Run** `uv run pytest -v` — Expected: all default tests pass.
- [ ] **Step 5: Real end-to-end once by hand** with one phone photo per category:
  `uv run python -m product data/try/product/request.json data/try/product/result.json`
  Expected: 3 images in `data/try/product/variants/`, `result.json` validates, each variant has scores. Look at the images and note obvious threshold misses for Task 8.
- [ ] **Step 6: Commit** `git commit -m "feat(product): add run flow and CLI"`

---

### Task 8: Eval collection script

**Files:**
- Create: `eval/__init__.py`, `eval/product/__init__.py`, `eval/product/collect.py`
- Test: `eval/product/test_collect.py`

**Interfaces:**
- Consumes: `product.run.run`, `ProductResult`.
- Produces: `python -m eval.product.collect <items.csv> <out_dir>`; `items.csv` columns `image,category,label_text,props`. For each row: writes `out_dir/<row>/request.json`, runs `run()`, appends one line per variant to `out_dir/metrics.csv` with columns `item,category,variant,attempts,repaired,passed,ocr_cer,dino_sim,delta_e,silhouette_iou,ssim,fail_reasons,label_cer`. `label_cer` = `cer(label_text, read_text(final variant crop))` against the hand-transcribed label (empty when `label_text` is empty). Prints min / median / max of each metric per category (used to tune thresholds on the first 2 items per category).
- A failing item is logged and skipped; the run continues.

- [ ] **Step 1: Failing test** with `run` monkeypatched to write a fixed `ProductResult`: 2 items → `metrics.csv` has 6 rows and the header above.
- [ ] **Step 2: Run** `uv run pytest eval/product/test_collect.py -v` — FAIL; implement; run — PASS.
- [ ] **Step 3: Commit** `git commit -m "feat(eval): add product eval collection"`

Not in this plan (add when the data exists): human ratings sheet and Spearman's rho, model-vs-model comparison runs.
