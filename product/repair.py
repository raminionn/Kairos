"""Repairs: real-cutout paste (product, packaging) and chroma screen paste (app)."""

import cv2
import numpy as np
from skimage.metrics import structural_similarity

RELIGHT_PROMPT = (
    "Relight the product to match this scene's lighting and shadows. "
    "Do not change the product's shape, text, logo or colours."
)


def _bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(mask)
    return ys.min(), ys.max() + 1, xs.min(), xs.max() + 1


def paste_cutout(source: np.ndarray, source_mask: np.ndarray, output: np.ndarray, output_mask: np.ndarray) -> np.ndarray:
    """Paste the real product over the generated one: fit inside the output mask box, keep aspect, centre."""
    sy0, sy1, sx0, sx1 = _bbox(source_mask)
    piece = source[sy0:sy1, sx0:sx1]
    alpha = source_mask[sy0:sy1, sx0:sx1].astype(np.float32)

    oy0, oy1, ox0, ox1 = _bbox(output_mask)
    bh, bw = oy1 - oy0, ox1 - ox0
    scale = min(bw / piece.shape[1], bh / piece.shape[0])
    w, h = max(1, round(piece.shape[1] * scale)), max(1, round(piece.shape[0] * scale))
    piece = cv2.resize(piece, (w, h), interpolation=cv2.INTER_AREA)
    alpha = cv2.GaussianBlur(cv2.resize(alpha, (w, h), interpolation=cv2.INTER_LINEAR), (0, 0), 1.5)[..., None]

    y, x = oy0 + (bh - h) // 2, ox0 + (bw - w) // 2
    out = output.astype(np.float32)
    region = out[y : y + h, x : x + w]
    out[y : y + h, x : x + w] = alpha * piece + (1 - alpha) * region
    return out.round().astype(np.uint8)


def _order(pts: np.ndarray) -> np.ndarray:
    """TL, TR, BR, BL."""
    s, d = pts.sum(1), np.diff(pts, axis=1).ravel()
    return np.float32([pts[s.argmin()], pts[d.argmin()], pts[s.argmax()], pts[d.argmax()]])


def find_green_quad(img: np.ndarray) -> np.ndarray | None:
    """Corners of the pure green (#00FF00) screen the app template asks for, or None."""
    r, g, b = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)
    m = ((g >= 200) & (r <= 80) & (b <= 80)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    c = max(contours, key=cv2.contourArea)
    if cv2.contourArea(c) < 0.02 * img.shape[0] * img.shape[1]:
        return None
    approx = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
    if len(approx) != 4:
        return None
    return _order(approx.reshape(4, 2).astype(np.float32))


def _src_rect(shot: np.ndarray) -> np.ndarray:
    h, w = shot.shape[:2]
    return np.float32([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]])


def paste_screen(img: np.ndarray, quad: np.ndarray, screenshot: np.ndarray) -> np.ndarray:
    """Perspective-warp the real screenshot onto the green quad."""
    H, W = img.shape[:2]
    M = cv2.getPerspectiveTransform(_src_rect(screenshot), quad)
    warped = cv2.warpPerspective(screenshot, M, (W, H), borderMode=cv2.BORDER_REPLICATE)
    mask = np.zeros((H, W), np.uint8)
    cv2.fillConvexPoly(mask, quad.astype(np.int32), 1)
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8)).astype(bool)  # cover the green edge (2 px)
    out = img.copy()
    out[mask] = warped[mask]
    return out


def screen_ssim(img: np.ndarray, quad: np.ndarray, screenshot: np.ndarray) -> float:
    """Compare the screen region with the screenshot (greyscale SSIM) at the quad's own size.

    Comparing at full screenshot size would measure resolution lost on a small screen, not paste errors.
    """
    tl, tr, br, bl = quad
    w = max(8, round((np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2))
    h = max(8, round((np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2))
    target = np.float32([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]])
    back = cv2.warpPerspective(img, cv2.getPerspectiveTransform(quad, target), (w, h))
    a = cv2.cvtColor(back, cv2.COLOR_RGB2GRAY)
    b = cv2.cvtColor(cv2.resize(screenshot, (w, h), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY)
    return float(structural_similarity(a, b, data_range=255))
