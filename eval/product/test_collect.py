import csv

import numpy as np
from PIL import Image

from contracts.product import Checks, ProductResult, Variant
from eval.product import collect
from product import gate
from product import run as run_mod

HEADER = ["item", "category", "variant", "attempts", "repaired", "passed", "ocr_cer", "dino_sim",
          "delta_e", "silhouette_iou", "ssim", "fail_reasons", "label_cer"]


def fake_run(input_path, output_path, config):
    req = run_mod.ProductRequest.model_validate_json(input_path.read_text())
    if "broken" in input_path.parent.name:  # job folder is named after the upload
        raise run_mod.ProductError("no item found in the upload")
    (output_path.parent / "variants").mkdir(exist_ok=True)
    vs = []
    for i in range(1, 4):
        Image.new("RGB", (32, 32), "white").save(output_path.parent / f"variants/v{i}.png")
        vs.append(Variant(id=f"v{i}", path=f"variants/v{i}.png", attempts=1, repaired=False, passed=True,
                          checks=Checks(dino_sim=0.9), fail_reasons=[]))
    output_path.write_text(ProductResult(category=req.category, model="m", reference_text="", variants=vs).model_dump_json())


def test_collect_writes_one_row_per_variant_and_skips_failures(tmp_path, monkeypatch):
    monkeypatch.setattr(run_mod, "run", fake_run)
    monkeypatch.setattr(gate, "get_mask", lambda img: np.ones(img.shape[:2], bool))
    monkeypatch.setattr(gate, "read_text", lambda img: "HONEY")
    for name in ("a.jpg", "b.png", "broken.jpg"):
        Image.new("RGB", (32, 32), "red").save(tmp_path / name)
    items = tmp_path / "items.csv"
    items.write_text("image,category,label_text,props\na.jpg,product,HONEY,\nb.png,app,,\nbroken.jpg,product,X,\n")

    metrics = collect.collect(items, tmp_path / "out", run_mod.load_config())

    rows = list(csv.reader(metrics.open()))
    assert rows[0] == HEADER and len(rows) == 7
    assert {r[1] for r in rows[1:]} == {"product", "app"}
    product_row = next(r for r in rows[1:] if r[1] == "product")
    app_row = next(r for r in rows[1:] if r[1] == "app")
    assert float(product_row[12]) == 0 and app_row[12] == ""
