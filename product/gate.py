"""Fidelity gate: pure metrics (this part) and GPU model wrappers (below).

Images are HxWx3 uint8 RGB arrays; masks are HxW bool arrays.
"""

import io
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps
from skimage.color import deltaE_ciede2000, rgb2lab

from contracts.product import Checks


def load_image(src: Path | bytes) -> np.ndarray:
    """Open a file path or raw bytes; apply EXIF rotation; return RGB."""
    f = io.BytesIO(src) if isinstance(src, bytes) else src
    with Image.open(f) as im:
        return np.asarray(ImageOps.exif_transpose(im).convert("RGB")).copy()


def _bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(mask)
    return ys.min(), ys.max() + 1, xs.min(), xs.max() + 1


def crop(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Bounding box of the mask; pixels outside the mask become white."""
    y0, y1, x0, x1 = _bbox(mask)
    out = img[y0:y1, x0:x1].copy()
    out[~mask[y0:y1, x0:x1]] = 255
    return out


def _norm(s: str) -> str:
    return " ".join(s.upper().split())


def cer(reference: str, hypothesis: str) -> float:
    """Character error rate: Levenshtein distance / reference length."""
    ref, hyp = _norm(reference), _norm(hypothesis)
    prev = list(range(len(hyp) + 1))
    for i, rc in enumerate(ref, 1):
        cur = [i]
        for j, hc in enumerate(hyp, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (rc != hc)))
        prev = cur
    return prev[-1] / len(ref)


def delta_e(a: np.ndarray, mask_a: np.ndarray, b: np.ndarray, mask_b: np.ndarray) -> float:
    """CIEDE2000 between the mean CIELAB colours of the two masked regions.

    No pixel correspondence exists between two different images, so region means are compared.
    """
    la = rgb2lab(a)[mask_a].mean(axis=0)
    lb = rgb2lab(b)[mask_b].mean(axis=0)
    return float(deltaE_ciede2000(la, lb))


def _square(mask: np.ndarray, size: int = 256) -> np.ndarray:
    y0, y1, x0, x1 = _bbox(mask)
    m = mask[y0:y1, x0:x1]
    h, w = m.shape
    s = max(h, w)
    sq = np.zeros((s, s), np.uint8)
    sq[(s - h) // 2 : (s - h) // 2 + h, (s - w) // 2 : (s - w) // 2 + w] = m
    return cv2.resize(sq, (size, size), interpolation=cv2.INTER_NEAREST).astype(bool)


def silhouette_iou(mask_a: np.ndarray, mask_b: np.ndarray) -> float:
    """IoU after cropping each mask to its box and padding to a square (keeps aspect)."""
    a, b = _square(mask_a), _square(mask_b)
    return float((a & b).sum() / (a | b).sum())


# (check name, threshold key, fails when value is above the threshold)
_RULES = [
    ("ocr_cer", "ocr_cer_max", True),
    ("dino_sim", "dino_sim_min", False),
    ("delta_e", "delta_e_max", True),
    ("silhouette_iou", "silhouette_iou_min", False),
    ("ssim", "ssim_min", False),
]


def decide(checks: Checks, thresholds: dict[str, float]) -> list[str]:
    """Names of failed checks. A None check or a missing threshold is skipped."""
    failed = []
    for name, key, upper in _RULES:
        value, limit = getattr(checks, name), thresholds.get(key)
        if value is None or limit is None:
            continue
        if (value > limit) if upper else (value < limit):
            failed.append(name)
    return failed
