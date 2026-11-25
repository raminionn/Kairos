import cv2
import numpy as np
import pytest

from product import gate

pytestmark = pytest.mark.gpu


def red_disk():
    img = np.full((512, 512, 3), 255, np.uint8)
    cv2.circle(img, (256, 256), 120, (200, 0, 0), -1)
    yy, xx = np.mgrid[:512, :512]
    return img, (xx - 256) ** 2 + (yy - 256) ** 2 <= 120**2


def label(text="ORGANIC HONEY"):
    img = np.full((200, 900, 3), 255, np.uint8)
    cv2.putText(img, text, (30, 130), cv2.FONT_HERSHEY_SIMPLEX, 3, (0, 0, 0), 8)
    return img


def checkerboard():
    yy, xx = np.mgrid[:512, :512]
    g = (((xx // 32 + yy // 32) % 2) * 255).astype(np.uint8)
    return np.dstack([g, g, g])


def iou(a, b):
    return (a & b).sum() / (a | b).sum()


def test_mask_finds_red_disk_on_white():
    img, truth = red_disk()
    assert iou(gate.get_mask(img), truth) > 0.9


def test_read_text_reads_rendered_label():
    assert gate.cer("ORGANIC HONEY", gate.read_text(label())) < 0.1


def test_dino_same_image_high_different_low():
    img, _ = red_disk()
    assert gate.dino_similarity(img, img) > 0.95
    assert gate.dino_similarity(img, checkerboard()) < 0.6


def test_check_variant_text_free_source_skips_ocr():
    img, mask = red_disk()
    checks, out_mask, reasons = gate.check_variant(img, mask, "", img, {"dino_sim_min": 0.8})
    assert checks.ocr_cer is None and checks.dino_sim > 0.95 and reasons == []
    assert out_mask.shape == mask.shape


def test_peak_vram_under_6gb():
    import torch

    torch.cuda.reset_peak_memory_stats()
    img, _ = red_disk()
    gate.get_mask(img)
    gate.dino_similarity(img, img)
    gate.get_mask(img)  # reload after DINOv2 freed it
    assert torch.cuda.max_memory_allocated() < 5.5e9
