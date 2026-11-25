import numpy as np
import pytest
from PIL import Image

from contracts.product import Checks
from product.gate import cer, crop, decide, delta_e, label_text, load_image, silhouette_iou


def disk_mask(size, r, centre):
    yy, xx = np.mgrid[:size, :size]
    return (xx - centre[0]) ** 2 + (yy - centre[1]) ** 2 <= r * r


def rect_mask(size, half_w, half_h):
    m = np.zeros((size, size), bool)
    c = size // 2
    m[c - half_h : c + half_h, c - half_w : c + half_w] = True
    return m


def solid(rgb, shape):
    return np.full((*shape, 3), rgb, np.uint8)


def full_mask(shape):
    return np.ones(shape, bool)


def test_cer_identical_and_one_error():
    assert cer("ORGANIC HONEY", "organic  honey") == 0
    assert cer("HONEY", "HONFY") == pytest.approx(0.2)


def test_iou_ignores_position_and_scale():
    a = disk_mask(200, 40, (60, 60))
    b = disk_mask(600, 120, (400, 300))
    assert silhouette_iou(a, b) > 0.95


def test_iou_detects_shape_change():
    # disk vs tall thin rectangle of the same height
    assert silhouette_iou(disk_mask(200, 40, (100, 100)), rect_mask(200, 10, 40)) < 0.85


def test_delta_e_same_colour_different_sizes():
    a, ma = solid((200, 0, 0), (100, 100)), full_mask((100, 100))
    b, mb = solid((200, 0, 0), (300, 500)), full_mask((300, 500))
    assert delta_e(a, ma, b, mb) < 0.5


def test_delta_e_red_vs_orange_is_large():
    shape = (50, 50)
    assert delta_e(solid((200, 0, 0), shape), full_mask(shape), solid((230, 120, 0), shape), full_mask(shape)) > 8


def test_decide_skips_none_and_reports_failures():
    t = {"ocr_cer_max": 0.1, "dino_sim_min": 0.8, "delta_e_max": 8, "silhouette_iou_min": 0.85}
    assert decide(Checks(ocr_cer=None, dino_sim=0.9, delta_e=3, silhouette_iou=0.9), t) == []
    assert decide(Checks(dino_sim=0.9, delta_e=12, silhouette_iou=0.9), t) == ["delta_e"]


def test_decide_missing_threshold_skipped():
    assert decide(Checks(ssim=0.1), {"dino_sim_min": 0.8}) == []


def test_crop_whites_out_background():
    img = solid((10, 20, 30), (100, 100))
    m = disk_mask(100, 20, (50, 50))
    c = crop(img, m)
    assert c.shape[:2] == (41, 41)
    assert (c[0, 0] == 255).all() and (c[20, 20] == (10, 20, 30)).all()


def test_load_image_rgba_png(tmp_path):
    p = tmp_path / "a.png"
    Image.new("RGBA", (40, 20), (255, 0, 0, 128)).save(p)
    img = load_image(p)
    assert img.shape == (20, 40, 3) and img.dtype == np.uint8


def test_load_image_applies_exif_rotation(tmp_path):
    p = tmp_path / "a.jpg"
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation: rotate 90 CW
    Image.new("RGB", (40, 20), (0, 255, 0)).save(p, exif=exif)
    assert load_image(p).shape == (40, 20, 3)


def test_delta_e_memory_does_not_scale_with_full_image():
    import tracemalloc

    big = np.zeros((3000, 4000, 3), np.uint8)
    m = np.zeros((3000, 4000), bool)
    m[:10, :10] = True
    tracemalloc.start()
    delta_e(big, m, big, m)
    peak = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()
    assert peak < 100e6


def test_gpu_models_load_once_and_swap_via_cpu(monkeypatch):
    from product import gate as g

    class Fake:
        def __init__(self):
            self.where = []

        def to(self, device):
            self.where.append(device)
            return self

    loads = {"a": 0, "b": 0}

    def loader(name):
        def f():
            loads[name] += 1
            return Fake()
        return f

    monkeypatch.setattr(g, "_slot", {"name": None, "model": None})
    monkeypatch.setattr(g, "_parked", {})
    a = g._gpu_model("a", loader("a"))
    g._gpu_model("b", loader("b"))
    assert g._gpu_model("a", loader("a")) is a
    assert loads == {"a": 1, "b": 1}
    assert a.where[0] == "cpu"  # parked on CPU while b ran


def test_label_text_ignores_stray_ocr_noise():
    # A label-free jar gave OCR "7"; treating it as label text failed every image.
    assert label_text("7") == ""
    assert label_text(" - . ") == ""
    assert label_text("a1") == ""


def test_label_text_keeps_real_labels():
    assert label_text("ORGANIC HONEY 500g") == "ORGANIC HONEY 500g"
    assert label_text("  ABC ") == "ABC"
