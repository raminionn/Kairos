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
    la = rgb2lab(a[mask_a][None])[0].mean(axis=0)  # convert masked pixels only (full photo in float64 is >1 GB)
    lb = rgb2lab(b[mask_b][None])[0].mean(axis=0)
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


# ---------------------------------------------------------------- model wrappers
# torch / transformers / rapidocr import lazily: the pure part above runs without the `gpu` extra.

_slot: dict = {"name": None, "model": None}  # one model on the GPU at a time keeps peak VRAM under 6 GB
_parked: dict = {}  # inactive models wait in CPU RAM, so a swap does not reload from disk
_ocr = None


def _device():
    import torch

    return ("cuda", torch.float16) if torch.cuda.is_available() else ("cpu", torch.float32)


def _gpu_model(name: str, loader):
    if _slot["name"] != name:
        import torch

        if _slot["model"] is not None:
            _parked[_slot["name"]] = _slot["model"].to("cpu")
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        model = _parked.pop(name, None)
        model = loader() if model is None else model.to(_device()[0])
        _slot.update(name=name, model=model)
    return _slot["model"]


def _load_birefnet():
    from transformers import AutoModelForImageSegmentation

    dev, dtype = _device()
    m = AutoModelForImageSegmentation.from_pretrained("ZhengPeng7/BiRefNet", trust_remote_code=True)
    return m.to(dev, dtype).eval()


def _load_dino():
    from transformers import AutoModel

    dev, dtype = _device()
    return AutoModel.from_pretrained("facebook/dinov2-base").to(dev, dtype).eval()


_MEAN = np.array([0.485, 0.456, 0.406], np.float32)
_STD = np.array([0.229, 0.224, 0.225], np.float32)


def _tensor(img: np.ndarray, size: int):
    import torch

    dev, dtype = _device()
    x = (cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA).astype(np.float32) / 255 - _MEAN) / _STD
    return torch.from_numpy(x.transpose(2, 0, 1))[None].to(dev, dtype)


def get_mask(img: np.ndarray) -> np.ndarray:
    """Main object mask (BiRefNet, 1024x1024 input)."""
    import torch

    model = _gpu_model("birefnet", _load_birefnet)
    with torch.no_grad():
        prob = model(_tensor(img, 1024))[-1].sigmoid()[0, 0].float().cpu().numpy()
    h, w = img.shape[:2]
    return cv2.resize(prob, (w, h), interpolation=cv2.INTER_LINEAR) > 0.5


def read_text(img: np.ndarray) -> str:
    """Label text (RapidOCR, PP-OCR models, CPU). Lines with confidence < 0.5 are dropped."""
    global _ocr
    if _ocr is None:
        from rapidocr import RapidOCR

        _ocr = RapidOCR()
    res = _ocr(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    if res.txts is None:
        return ""
    return " ".join(t for t, s in zip(res.txts, res.scores) if s >= 0.5)


def label_text(raw: str) -> str:
    """OCR text worth checking as a label: at least 3 letters or digits, else "" (no label).

    A label-free source can give stray OCR noise like "7"; comparing every output to that
    would fail the label check on every image.
    """
    text = raw.strip()
    return text if sum(c.isalnum() for c in text) >= 3 else ""


def dino_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity of DINOv2-base CLS embeddings."""
    import torch

    model = _gpu_model("dinov2", _load_dino)
    with torch.no_grad():
        ea = model(pixel_values=_tensor(a, 224)).last_hidden_state[0, 0].float()
        eb = model(pixel_values=_tensor(b, 224)).last_hidden_state[0, 0].float()
    return float(torch.nn.functional.cosine_similarity(ea, eb, dim=0))


def check_variant(
    source: np.ndarray, source_mask: np.ndarray, reference_text: str, output: np.ndarray, thresholds: dict[str, float]
) -> tuple[Checks, np.ndarray, list[str]]:
    """Run all product checks on one generated image. Returns (checks, output mask, failed check names)."""
    out_mask = get_mask(output)
    if out_mask.sum() < 0.01 * out_mask.size:
        return Checks(), out_mask, ["no_item"]
    src_crop, out_crop = crop(source, source_mask), crop(output, out_mask)
    checks = Checks(
        ocr_cer=cer(reference_text, read_text(out_crop)) if reference_text.strip() else None,
        dino_sim=dino_similarity(src_crop, out_crop),
        delta_e=delta_e(source, source_mask, output, out_mask),
        silhouette_iou=silhouette_iou(source_mask, out_mask),
    )
    return checks, out_mask, decide(checks, thresholds)
