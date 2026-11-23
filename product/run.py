"""Product photo stage: request.json + upload -> variants/*.png + result.json."""

import tempfile
from pathlib import Path

import numpy as np
import yaml
from PIL import Image
from pydantic import ValidationError

from contracts.product import Checks, ProductRequest, ProductResult, Variant
from product import gate, generate, repair

TEMPLATES = Path(__file__).parent / "templates"
ALLOWED = {".jpg", ".jpeg", ".png", ".webp"}
MAX_BYTES = 20 * 1024 * 1024
REPAIRABLE = {"product", "packaging"}


class ProductError(Exception):
    pass


def load_config(path: Path = Path(__file__).parent / "config.yaml") -> dict:
    return yaml.safe_load(Path(path).read_text())


def load_template(category: str) -> dict:
    return yaml.safe_load((TEMPLATES / f"{category}.yaml").read_text())


def build_prompt(template: dict, props: str | None) -> str:
    return " ".join(template["prompt"].replace("{props}", props or "").split())


def _load_request(input_path: Path) -> tuple[ProductRequest, Path, np.ndarray]:
    try:
        req = ProductRequest.model_validate_json(input_path.read_text())
    except (OSError, ValidationError) as e:
        raise ProductError(f"bad request file: {e}") from e
    src = input_path.parent / req.image
    if src.suffix.lower() not in ALLOWED:
        raise ProductError(f"upload must be one of {sorted(ALLOWED)}, got {src.suffix or 'no extension'}")
    if not src.is_file():
        raise ProductError(f"upload not found: {req.image}")
    if src.stat().st_size > MAX_BYTES:
        raise ProductError("upload is larger than 20 MB")
    try:
        return req, src, gate.load_image(src)
    except Exception as e:
        raise ProductError("upload is not a readable image") from e


def _save(img: np.ndarray, path: Path) -> Path:
    Image.fromarray(img).save(path)
    return path


def run(input_path: Path, output_path: Path, config: dict) -> None:
    input_path, output_path = Path(input_path), Path(output_path)
    req, src_path, source = _load_request(input_path)
    cat = req.category
    template = load_template(cat)
    thresholds = config["thresholds"][cat]
    model = config["models"][cat]
    cache = Path(config.get("cache_dir", "data/cache/product"))
    prompt = build_prompt(template, req.props)
    vdir = output_path.parent / "variants"
    vdir.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        refs = [src_path]
        source_mask, reference_text = None, ""
        if cat != "app":
            source_mask = gate.get_mask(source)
            if source_mask.sum() < 0.01 * source_mask.size:
                raise ProductError("no item found in the upload")
            cut = gate.crop(source, source_mask)
            reference_text = gate.read_text(cut)
            refs.append(_save(cut, tmp / "cutout.png"))
        if template.get("reference_image"):
            refs.append(TEMPLATES / template["reference_image"])

        def gen(p: str, images: list[Path], key: str) -> np.ndarray:
            raw = generate.generate_image(model, p, images, key, cache, template.get("aspect_ratio"))
            return gate.load_image(raw)

        variants = []
        for i in range(1, req.n_variants + 1):
            img, checks, reasons, repaired, attempts = None, Checks(), [], False, 0
            step = ("gen", f"v{i}-a0", None)
            while attempts <= config["max_retries"]:
                attempts += 1
                kind, key, pasted = step
                try:
                    if kind == "gen":
                        img = gen(prompt, refs, key)
                    else:  # relight the pasted real cutout to the template's light
                        img = gen(repair.RELIGHT_PROMPT, [_save(pasted, tmp / f"pasted{i}.png")], key)
                except generate.MissingKeyError:
                    raise
                except generate.GenerationError:
                    reasons = ["generation_error"]
                    step = ("gen", f"v{i}-a{attempts}", None)
                    continue

                out_mask = None
                if cat == "app":
                    quad = repair.find_green_quad(img)
                    if quad is None:
                        checks, reasons = Checks(), ["no_screen"]
                    else:
                        img = repair.paste_screen(img, quad, source)
                        checks = Checks(ssim=repair.screen_ssim(img, quad, source))
                        reasons = gate.decide(checks, thresholds)
                else:
                    checks, out_mask, reasons = gate.check_variant(source, source_mask, reference_text, img, thresholds)
                if not reasons:
                    break

                can_repair = (
                    cat in REPAIRABLE
                    and not repaired
                    and checks.silhouette_iou is not None
                    and checks.silhouette_iou >= thresholds["repair_min"]
                    and out_mask is not None
                    and out_mask.any()
                )
                if can_repair:
                    repaired = True
                    step = ("relight", f"v{i}-r{attempts}", repair.paste_cutout(source, source_mask, img, out_mask))
                else:
                    step = ("gen", f"v{i}-a{attempts}", None)

            path = ""
            if img is not None:
                path = f"variants/v{i}.png"
                _save(img, output_path.parent / path)
            variants.append(
                Variant(id=f"v{i}", path=path, attempts=attempts, repaired=repaired,
                        passed=not reasons, checks=checks, fail_reasons=reasons)
            )

    result = ProductResult(category=cat, model=model, reference_text=reference_text, variants=variants)
    output_path.write_text(result.model_dump_json(indent=2))
