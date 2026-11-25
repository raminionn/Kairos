# Kairos: Product Photo Module Design

Status: draft for Ahmad's approval. Date: 2026-11-21. Owner: Ahmad. Folder: `product/`.
Must agree with `docs/specs/2026-11-17-kairos-system-design.md` (sections 5, 8, 10).

## 1. Intent

A user uploads one image of their item and picks a category. An image model makes 3 finished,
website-ready images in that category's style. A **fidelity gate** then checks that each image still
shows the user's real item: same label text, same look, same colour, same shape. The gate is the
module's contribution to the FYP. Image models often change small details (label text, logo,
colour); the gate catches this, repairs or regenerates, and never shows a failed image as passed.

## 2. Goals, non-goals, anti-goals

Goals
- 4 categories, one template each: **fashion, app, product, packaging**.
- Standalone stage: `python -m product request.json out/result.json`, file in, file out.
- Every output image carries its check scores and a pass/fail result.
- Image model is a config value per category; any OpenRouter image model (free or paid) can be used.

Non-goals (v1)
- More than one style per category. (Ahmad may add styles later. A style is one more template file.)
- A separate VLM step that describes the product. The upload goes straight into the image model.
- Local image generation.
- User accounts, saved products.

Anti-goals
- A failed image shown as passed, or shown without its result.
- A gate threshold set by guesswork and never tuned on real data.
- A stage that needs the API, queue or DB to run.

## 3. Constraints

- GPU: RTX 3050, 6 GB VRAM. Too small for image generation (Flux Kontext needs about 12 GB or more).
  Big enough for the check models if they load one at a time in fp16.
- Image generation goes through OpenRouter's Image API (key already in `.env.example`).
- Stage rules from the system design: no DB access, no imports from other stages, contract
  validation on read and write.

## 4. Approaches considered

| | Approach | Trade-off | Decision |
|---|---|---|---|
| A | Gemini image model only (Nano Banana) | Cheap, fast, keeps product identity well; sometimes changes small text | Covered by C |
| B | OpenAI gpt-image only | High quality, follows prompts well; costs more, redraws more of the product in edits | Covered by C |
| C | OpenRouter Image API, model id per category in config | One client, any model (Gemini, gpt-image, Flux, Seedream, free ones). Eval can compare models on gate metrics | **Chosen** (Ahmad has OpenRouter) |
| D | Local open model (Flux + PuLID, SDXL) | No API cost; does not fit 6 GB or keeps details badly | Rejected |

## 5. Design

### 5.1 Categories and templates

| Category | User uploads | Output | Gate | Repair allowed |
|---|---|---|---|---|
| `fashion` | photo of a real garment | website-ready garment image | colour, DINOv2, loose silhouette, OCR if text found | no (on-model styles bend the garment; regenerate only) |
| `app` | app or website screenshot | device in a scene with the real screenshot on the screen | screen pixel match | not needed (see 5.4) |
| `product` | photo of a product | styled product photo | OCR, DINOv2, colour, silhouette | yes |
| `packaging` | photo of a package, or its label design | package in a scene | OCR, DINOv2, colour, silhouette | yes |

One template file per category: `product/templates/<category>.yaml`.

```yaml
prompt: |
  <Ahmad writes this. May contain {props}.>
reference_image: product.ref.jpg   # optional, scene look; sent as a second input image
aspect_ratio: "4:5"
```

Ahmad writes the 4 prompts. `{props}` is replaced by the optional props line, or removed when empty.

### 5.2 Contracts (`contracts/product.py`)

`ProductRequest` (written by the worker, or by hand for the CLI):

```json
{ "version": 1, "category": "product", "image": "source.jpg", "props": "eucalyptus leaves", "n_variants": 3 }
```

`ProductResult` (written by the stage):

```json
{
  "version": 1,
  "category": "product",
  "model": "google/gemini-2.5-flash-image",
  "reference_text": "ORGANIC HONEY 500g",
  "variants": [
    {
      "id": "v1",
      "path": "variants/v1.png",
      "attempts": 2,
      "repaired": true,
      "passed": true,
      "checks": { "ocr_cer": 0.04, "dino_sim": 0.91, "delta_e": 3.2, "silhouette_iou": 0.88 },
      "fail_reasons": []
    }
  ]
}
```

- Paths are relative to the request file's folder (the job folder).
- A check that does not apply is `null` (for example `ocr_cer` when the source has no text).
- `fail_reasons` lists each failed check by name, for the UI and eval.

`fixtures/product.request.json` and `fixtures/product.result.json` hold one hand-written example each.
`contracts/` and `fixtures/` are shared folders, so this part needs a PR reviewed by all three.

### 5.3 Flow (product, packaging, fashion)

```
request.json + source image
  1. validate: contract, image type (jpg/png/webp), size limit
  2. reference: BiRefNet mask of source -> cutout; OCR the cutout -> reference_text
  3. generate: OpenRouter POST /api/v1/images
       model = config[category], prompt = template + props,
       input_references = [source, source cutout on white, template reference_image?]
       (3 variants: one call per variant)
  4. gate each variant:
       BiRefNet mask of output -> crop
       ocr_cer        OCR of crop vs reference_text      (skip if reference_text empty)
       dino_sim       DINOv2 cosine, source crop vs output crop
       delta_e        mean CIEDE2000 inside the masks
       silhouette_iou masks scaled to the same bounding box, then IoU
  5. on fail, per variant, max 2 retries:
       repair if allowed and silhouette_iou >= repair_min:
         paste the source cutout onto the output at the output mask's box, then one relight pass
         through the same image model ("relight the product to match this scene, do not change its
         shape, text or colours"), re-check. Light always comes from the template, never the upload.
       else regenerate that variant, re-check
  6. write variants/*.png and result.json; a variant that still fails has passed=false
```

### 5.4 App category: chroma screen

Image models redraw screenshots badly, so the model never draws the screen.
- The `app` template prompt asks for the device with a solid pure green (`#00FF00`) screen.
- Code finds the green region, fits a 4-corner quad, and perspective-warps the real screenshot onto it
  (OpenCV `getPerspectiveTransform` + `warpPerspective`).
- Check: the green quad exists, has 4 corners and the screenshot's aspect ratio within a tolerance.
  After the paste, the warped region is compared with the screenshot (SSIM). No green quad means
  regenerate.

### 5.5 Config (`product/config.yaml`)

```yaml
device: cuda            # cpu also works, slower
max_retries: 2
n_variants: 3
models:                 # OpenRouter image model ids; free or paid
  fashion: <tbd>
  app: <tbd>
  product: <tbd>
  packaging: <tbd>
thresholds:             # starting values; tuned on the first eval items (section 7)
  product:   { ocr_cer_max: 0.10, dino_sim_min: 0.80, delta_e_max: 8, silhouette_iou_min: 0.85, repair_min: 0.70 }
  packaging: { ocr_cer_max: 0.10, dino_sim_min: 0.80, delta_e_max: 8, silhouette_iou_min: 0.85, repair_min: 0.70 }
  fashion:   { ocr_cer_max: 0.15, dino_sim_min: 0.75, delta_e_max: 10, silhouette_iou_min: 0.60 }
  app:       { ssim_min: 0.90 }
```

### 5.6 Models and where they run

| Job | Model | Runs on |
|---|---|---|
| Image generation | OpenRouter Image API | API |
| Cutout and mask | BiRefNet (Hugging Face) | GPU, fp16 |
| Identity | DINOv2-base | GPU, fp16 |
| Label text | RapidOCR (PP-OCR models via ONNX Runtime) | CPU (no `paddlepaddle` install, which is fragile on Windows) |
| Relight after paste | same image model, relight prompt | API |
| Colour | CIEDE2000 (`scikit-image`) | CPU |

Models load on first use and are freed before the next large one loads, so the peak stays under 6 GB.
IC-Light was dropped (2026-11-23): too close to 6 GB and not a library; the relight pass through the
image model replaces it.

### 5.7 Files

```
product/
  __main__.py     # CLI: python -m product request.json result.json
  run.py          # run(input_path, output_path, config): the flow in 5.3
  generate.py     # OpenRouter image call, disk cache
  gate.py         # mask, OCR, DINOv2, delta E, IoU, pass/fail
  repair.py       # cutout paste; app chroma paste
  config.yaml
  templates/      # fashion.yaml app.yaml product.yaml packaging.yaml + reference images
contracts/product.py
fixtures/product.request.json  fixtures/product.result.json
eval/product/
```

The image client lives in `product/generate.py`, not `shared/`, because only this module uses it now.
It moves to `shared/` when thumbnails (Adina) need it.

Disk cache: generated images are cached by hash of (model, prompt, input image bytes, variant index),
so eval re-runs cost nothing.

### 5.8 Job folder, API, web

```
data/jobs/<job_id>/
  source.jpg  request.json  result.json
  variants/v1.png  v2.png  v3.png
```

- Job kind `product`, output kind `product_image` (one per variant), with `checks`, `passed` and
  `fail_reasons` in `meta`. As in system design section 10.
- `POST /jobs/product`: multipart `file` + `category` + `props`. **Change to the system design:** the
  field is `category`, not `style`. Tell Adina.
- Web: `product/new` (upload, category, props), `product/[id]` (3 images, each with a pass/fail badge
  and the scores).

### 5.9 Validation and errors

- API checks upload type and size. The stage checks again (it can run from the CLI).
- OpenRouter response: each entry must decode to an image. Bad or missing image counts as a failed
  attempt (uses one retry). HTTP errors retry with backoff, then the job fails with a clear error.
- Empty mask (BiRefNet finds no object) on the source: the job fails with "no item found in the
  upload". On an output: that variant fails and regenerates.

## 6. Evaluation (`eval/product/`)

- Set: 20 items, 5 per category, phone photos (screenshots for `app`). Label text hand-transcribed.
  Data git-ignored.
- Threshold tuning: the first 2 items per category (8 total) set the thresholds; the other 12 are
  held out for the reported numbers.
- Metrics: OCR CER, DINOv2 similarity, delta E, silhouette IoU; drift rate before vs after repair;
  human fidelity and quality ratings; Spearman's rho between automatic metrics and human ratings.
- Optional: the same set through 2 models to compare them on the gate metrics.

## 7. Left to the builder

- Exact OpenRouter model ids per category: try 2 or 3 on sample uploads. The OpenRouter docs list no
  free image models, so check `GET /api/v1/images/models` for current free ones.
- The 4 template prompts: Ahmad provides them.
- Starting threshold values above are guesses; they change after tuning.
- CER function: a short Levenshtein in `gate.py` or an installed library.
