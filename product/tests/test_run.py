import io
import json
import os
import subprocess
import sys

import cv2
import numpy as np
import pytest
from PIL import Image

from contracts.product import Checks, ProductResult
from product import gate, generate, repair, run as run_mod
from product.generate import GenerationError
from product.run import ProductError, build_prompt, load_config, run

ROOT = __import__("pathlib").Path(__file__).resolve().parents[2]
PASS = Checks(ocr_cer=0.0, dino_sim=0.95, delta_e=2.0, silhouette_iou=0.95)


def png(img: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(img).save(buf, "PNG")
    return buf.getvalue()


def disk_image():
    img = np.full((120, 120, 3), 255, np.uint8)
    cv2.circle(img, (60, 60), 30, (200, 0, 0), -1)
    return img


def green_scene():
    img = np.full((300, 400, 3), 128, np.uint8)
    cv2.fillPoly(img, [np.int32([[150, 50], [260, 70], [250, 260], [140, 240]])], (0, 255, 0))
    return img


@pytest.fixture
def job(tmp_path, monkeypatch):
    """Job folder with a source image; fakes for every model and the API."""
    Image.fromarray(disk_image()).save(tmp_path / "source.jpg")
    calls = {"generate": [], "checks": []}
    state = {"images": [], "checks": [], "mask_empty": False}

    def fake_generate(model, prompt, images, key, cache_dir, aspect_ratio=None, client=None):
        sizes = [(Image.open(p).size, p.suffix) for p in images]  # temp files are gone after run()
        calls["generate"].append({"prompt": prompt, "key": key, "images": images, "sizes": sizes})
        nxt = state["images"].pop(0) if state["images"] else disk_image()
        if isinstance(nxt, Exception):
            raise nxt
        return png(nxt)

    def fake_mask(img):
        m = np.zeros(img.shape[:2], bool)
        if not state["mask_empty"]:
            h, w = m.shape
            m[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4] = True
        return m

    def fake_check(source, source_mask, reference_text, output, thresholds):
        calls["checks"].append(reference_text)
        checks = state["checks"].pop(0) if state["checks"] else PASS
        return checks, fake_mask(output), gate.decide(checks, thresholds)

    monkeypatch.setattr(generate, "generate_image", fake_generate)
    monkeypatch.setattr(gate, "get_mask", fake_mask)
    monkeypatch.setattr(gate, "read_text", lambda img: "HONEY")
    monkeypatch.setattr(gate, "check_variant", fake_check)

    config = load_config()
    config["cache_dir"] = str(tmp_path / "cache")

    def go(category="product", image="source.jpg", n=3, props=None):
        req = tmp_path / "request.json"
        req.write_text(json.dumps({"category": category, "image": image, "n_variants": n, "props": props}), encoding="utf-8")
        run(req, tmp_path / "result.json", config)
        return ProductResult.model_validate_json((tmp_path / "result.json").read_text(encoding="utf-8"))

    return {"dir": tmp_path, "go": go, "calls": calls, "state": state}


def test_all_pass_first_try(job):
    res = job["go"]()
    assert len(res.variants) == 3
    assert all(v.passed and v.attempts == 1 and not v.repaired for v in res.variants)
    assert all((job["dir"] / v.path).exists() for v in res.variants)
    assert res.reference_text == "HONEY"
    assert len(job["calls"]["generate"][0]["images"]) >= 2  # source + cutout


def test_repair_then_pass(job):
    job["state"]["checks"] = [Checks(dino_sim=0.95, delta_e=12, silhouette_iou=0.75), PASS]
    res = job["go"](n=1)
    v = res.variants[0]
    assert v.passed and v.repaired and v.attempts == 2
    relight = job["calls"]["generate"][1]
    assert relight["prompt"] == repair.RELIGHT_PROMPT and relight["key"] == "v1-r1"


def test_repair_happens_at_most_once(job):
    near = Checks(dino_sim=0.95, delta_e=12, silhouette_iou=0.75)  # repairable every time
    job["state"]["checks"] = [near] * 3
    v = job["go"](n=1).variants[0]
    keys = [c["key"] for c in job["calls"]["generate"]]
    assert keys == ["v1-a0", "v1-r1", "v1-a2"] and v.repaired and not v.passed


def test_low_iou_regenerates_instead_of_repair(job):
    job["state"]["checks"] = [Checks(dino_sim=0.95, delta_e=2, silhouette_iou=0.5), PASS]
    v = job["go"](n=1).variants[0]
    assert v.passed and not v.repaired and job["calls"]["generate"][1]["key"] == "v1-a1"


def test_fashion_never_repairs(job):
    job["state"]["checks"] = [Checks(dino_sim=0.5, delta_e=2, silhouette_iou=0.9), PASS]
    v = job["go"](category="fashion", n=1).variants[0]
    assert v.passed and not v.repaired
    assert job["calls"]["generate"][1]["key"] == "v1-a1"
    assert all(c["prompt"] != repair.RELIGHT_PROMPT for c in job["calls"]["generate"])


def test_still_failing_after_retries_is_kept(job):
    bad = Checks(dino_sim=0.1, delta_e=30, silhouette_iou=0.1)
    job["state"]["checks"] = [bad] * 3
    v = job["go"](n=1).variants[0]
    assert v.attempts == 3 and not v.passed and v.fail_reasons
    assert (job["dir"] / v.path).exists()


def test_generation_error_counts_as_attempt(job):
    job["state"]["images"] = [GenerationError("boom")]
    v = job["go"](n=1).variants[0]
    assert v.passed and v.attempts == 2


def test_all_generations_fail_variant_kept_failed(job):
    job["state"]["images"] = [GenerationError("boom")] * 3
    v = job["go"](n=1).variants[0]
    assert not v.passed and v.attempts == 3 and "generation_error" in v.fail_reasons


def test_app_no_green_regenerates(job):
    job["state"]["images"] = [np.full((300, 400, 3), 128, np.uint8), green_scene()]
    res = job["go"](category="app", n=1)
    v = res.variants[0]
    assert v.passed and v.attempts == 2 and v.checks.ssim > 0.9
    assert job["calls"]["generate"][1]["key"] == "v1-a1"
    assert job["calls"]["checks"] == []  # app never runs the product gate


def test_no_item_found(job):
    job["state"]["mask_empty"] = True
    with pytest.raises(ProductError, match="no item found in the upload"):
        job["go"]()


def test_bad_upload_type(job):
    (job["dir"] / "a.gif").write_bytes(b"GIF89a")
    with pytest.raises(ProductError):
        job["go"](image="a.gif")


def test_missing_upload(job):
    with pytest.raises(ProductError):
        job["go"](image="nope.jpg")


def test_build_prompt_props():
    t = {"prompt": "A product shot. {props} Soft light."}
    assert build_prompt(t, "eucalyptus leaves") == "A product shot. eucalyptus leaves Soft light."
    assert build_prompt(t, None) == "A product shot. Soft light."


def test_cli_exit_code_on_missing_key(tmp_path):
    Image.fromarray(disk_image()).save(tmp_path / "source.jpg")
    (tmp_path / "request.json").write_text(json.dumps({"category": "app", "image": "source.jpg"}))
    env = {k: v for k, v in os.environ.items() if k != "OPENROUTER_API_KEY"}
    env["PYTHONPATH"] = str(ROOT)
    # cwd = tmp_path, so the CLI finds no .env file there
    p = subprocess.run(
        [sys.executable, "-m", "product", str(tmp_path / "request.json"), str(tmp_path / "result.json")],
        capture_output=True, text=True, env=env, cwd=tmp_path,
    )
    assert p.returncode == 1
    assert "OPENROUTER_API_KEY" in p.stderr


def test_fatal_generation_error_stops_job(job):
    job["state"]["images"] = [generate.FatalGenerationError("HTTP 402: no credits")]
    with pytest.raises(generate.FatalGenerationError):
        job["go"](n=1)


def test_generation_error_reason_is_printed(job, capsys):
    job["state"]["images"] = [GenerationError("HTTP 400: model has no input_references")]
    job["go"](n=1)
    assert "input_references" in capsys.readouterr().err


def test_unicode_props_and_label_text(job, monkeypatch):
    monkeypatch.setattr(gate, "read_text", lambda img: "蜂蜜 HONEY")
    res = job["go"](n=1, props="شہد کے پھول")
    assert res.reference_text == "蜂蜜 HONEY"
    assert "شہد کے پھول" in job["calls"]["generate"][0]["prompt"]


def test_sends_upright_resized_png_not_raw_upload(job):
    exif = Image.Exif()
    exif[0x0112] = 6  # rotate 90 CW: stored 4000x1000 landscape, shown 1000x4000 portrait
    img = Image.new("RGB", (4000, 1000), (200, 0, 0))
    img.save(job["dir"] / "source.jpg", exif=exif)
    job["go"](n=1)
    (w, h), suffix = job["calls"]["generate"][0]["sizes"][0]
    assert suffix == ".png"
    assert h > w and max(w, h) <= 2048
