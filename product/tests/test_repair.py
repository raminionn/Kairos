import cv2
import numpy as np

from product.repair import find_green_quad, paste_cutout, paste_screen, screen_ssim

CORNERS = np.float32([[300, 100], [520, 140], [500, 520], [280, 480]])  # TL, TR, BR, BL, tilted


def scene_with_green_quad():
    img = np.full((600, 800, 3), 128, np.uint8)
    cv2.fillPoly(img, [CORNERS.astype(np.int32)], (0, 255, 0))
    return img, CORNERS


def checkerboard_with_text(w, h):
    yy, xx = np.mgrid[:h, :w]
    img = (((xx // 30 + yy // 30) % 2) * 200 + 30).astype(np.uint8)
    img = np.dstack([img, img, img]).copy()
    cv2.putText(img, "APP", (40, h // 2), cv2.FONT_HERSHEY_SIMPLEX, 3, (255, 0, 0), 6)
    return img


def test_find_quad_on_tilted_green_screen():
    img, corners = scene_with_green_quad()
    q = find_green_quad(img)
    assert q is not None and np.abs(q - corners).max() <= 3


def test_no_green_returns_none():
    assert find_green_quad(np.full((600, 800, 3), 128, np.uint8)) is None


def test_small_green_speck_returns_none():
    img = np.full((600, 800, 3), 128, np.uint8)
    img[10:20, 10:20] = (0, 255, 0)
    assert find_green_quad(img) is None


def test_paste_then_ssim_high_and_no_green_left():
    img, corners = scene_with_green_quad()
    shot = checkerboard_with_text(390, 844)
    out = paste_screen(img, corners, shot)
    assert screen_ssim(out, corners, shot) > 0.9
    assert find_green_quad(out) is None


def test_ssim_low_for_wrong_screenshot():
    img, corners = scene_with_green_quad()
    out = paste_screen(img, corners, checkerboard_with_text(390, 844))
    other = np.full((844, 390, 3), 240, np.uint8)
    cv2.putText(other, "LOGIN", (20, 400), cv2.FONT_HERSHEY_SIMPLEX, 3, (0, 0, 0), 6)
    assert screen_ssim(out, corners, other) < 0.5


def test_paste_cutout_lands_inside_output_box():
    src = np.full((200, 200, 3), 255, np.uint8)
    yy, xx = np.mgrid[:200, :200]
    src_mask = (xx - 100) ** 2 + (yy - 100) ** 2 <= 60**2
    src[src_mask] = (220, 0, 0)

    scene = np.full((400, 600, 3), 128, np.uint8)
    scene_mask = np.zeros((400, 600), bool)
    scene_mask[100:300, 350:550] = True  # different place and size
    scene[scene_mask] = (0, 0, 220)

    out = paste_cutout(src, src_mask, scene, scene_mask)
    red = (out[..., 0] > 180) & (out[..., 1] < 60) & (out[..., 2] < 60)
    ys, xs = np.nonzero(red)
    assert ys.min() >= 100 and ys.max() < 300 and xs.min() >= 350 and xs.max() < 550
    assert red.sum() > 0.5 * scene_mask.sum()
