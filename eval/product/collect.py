"""Run the product stage over an eval set and collect gate metrics.

python -m eval.product.collect items.csv out_dir
items.csv columns: image,category,label_text,props   (image paths relative to items.csv)
"""

import csv
import json
import shutil
import statistics
import sys
from pathlib import Path

from contracts.product import ProductResult
from product import gate
from product import run as run_mod

HEADER = ["item", "category", "variant", "attempts", "repaired", "passed", "ocr_cer", "dino_sim",
          "delta_e", "silhouette_iou", "ssim", "fail_reasons", "label_cer"]
METRICS = ["ocr_cer", "dino_sim", "delta_e", "silhouette_iou", "ssim", "label_cer"]


def _label_cer(label_text: str, variant_png: Path) -> str:
    """CER of the final image's text against the hand-transcribed label ('' when no label)."""
    if not label_text.strip() or not variant_png.is_file():
        return ""
    img = gate.load_image(variant_png)
    mask = gate.get_mask(img)
    if not mask.any():
        return "1.0"
    return f"{gate.cer(label_text, gate.read_text(gate.crop(img, mask))):.4f}"


def _fmt(v) -> str:
    return "" if v is None else f"{v:.4f}" if isinstance(v, float) else str(v)


def collect(items_csv: Path, out_dir: Path, config: dict) -> Path:
    items_csv, out_dir = Path(items_csv), Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for n, item in enumerate(csv.DictReader(items_csv.open(newline="")), 1):
        src = items_csv.parent / item["image"]
        job = out_dir / f"{n:02d}_{src.stem}"
        job.mkdir(exist_ok=True)
        shutil.copy(src, job / f"source{src.suffix.lower()}")
        req = {"category": item["category"], "image": f"source{src.suffix.lower()}", "props": item.get("props") or None}
        (job / "request.json").write_text(json.dumps(req))
        try:
            run_mod.run(job / "request.json", job / "result.json", config)
        except Exception as e:  # one bad item must not stop the eval run
            print(f"skip {src.name}: {e}", file=sys.stderr)
            continue
        res = ProductResult.model_validate_json((job / "result.json").read_text())
        for v in res.variants:
            c = v.checks
            label = _label_cer(item.get("label_text", ""), job / v.path) if v.path else ""
            rows.append([job.name, res.category, v.id, v.attempts, v.repaired, v.passed, _fmt(c.ocr_cer),
                         _fmt(c.dino_sim), _fmt(c.delta_e), _fmt(c.silhouette_iou), _fmt(c.ssim),
                         ";".join(v.fail_reasons), label])

    metrics = out_dir / "metrics.csv"
    with metrics.open("w", newline="") as f:
        csv.writer(f).writerows([HEADER, *rows])
    _summary(rows)
    return metrics


def _summary(rows: list[list]) -> None:
    """min / median / max per metric per category, for threshold tuning."""
    for cat in sorted({r[1] for r in rows}):
        print(f"\n{cat}")
        for m in METRICS:
            vals = [float(r[HEADER.index(m)]) for r in rows if r[1] == cat and r[HEADER.index(m)] != ""]
            if vals:
                print(f"  {m:15} min {min(vals):.3f}  median {statistics.median(vals):.3f}  max {max(vals):.3f}")


if __name__ == "__main__":
    from dotenv import load_dotenv

    if len(sys.argv) != 3:
        sys.exit(__doc__)
    load_dotenv(Path.cwd() / ".env")
    collect(Path(sys.argv[1]), Path(sys.argv[2]), run_mod.load_config())
