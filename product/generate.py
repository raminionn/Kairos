"""OpenRouter Image API client with a disk cache."""

import base64
import hashlib
import io
import mimetypes
import os
import time
from pathlib import Path

import httpx
from PIL import Image

URL = "https://openrouter.ai/api/v1/images"
_BACKOFF = [2, 4, 8]  # seconds before try 2, 3, (unused)
_sleep = time.sleep  # patched in tests


class GenerationError(Exception):
    pass


class MissingKeyError(GenerationError):
    """Fatal: no API key. run() does not treat this as one failed attempt."""


def _data_url(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


def _cache_key(model: str, prompt: str, aspect_ratio: str | None, images: list[Path], key: str) -> str:
    h = hashlib.sha256()
    for part in (model, prompt, aspect_ratio or "", key):
        h.update(part.encode() + b"\0")
    for p in images:
        h.update(hashlib.sha256(p.read_bytes()).digest())
    return h.hexdigest()


def _decode(body: dict) -> bytes:
    try:
        raw = base64.b64decode(body["data"][0]["b64_json"])
        Image.open(io.BytesIO(raw)).verify()
    except Exception as e:  # missing field, empty list, bad base64, not an image
        raise GenerationError(f"response has no valid image: {type(e).__name__}") from e
    return raw


def generate_image(
    model: str,
    prompt: str,
    images: list[Path],
    key: str,
    cache_dir: Path,
    aspect_ratio: str | None = None,
    client: httpx.Client | None = None,
) -> bytes:
    """Generate one image from a prompt and reference images. `key` separates variants/attempts."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise MissingKeyError("OPENROUTER_API_KEY is not set")

    cache_dir = Path(cache_dir)
    cached = cache_dir / f"{_cache_key(model, prompt, aspect_ratio, images, key)}.img"
    if cached.exists():
        return cached.read_bytes()

    body = {
        "model": model,
        "prompt": prompt,
        "n": 1,
        "input_references": [{"type": "image_url", "image_url": {"url": _data_url(p)}} for p in images],
    }
    if aspect_ratio:
        body["aspect_ratio"] = aspect_ratio

    client = client or httpx.Client(timeout=180)
    last = ""
    for attempt in range(3):
        if attempt:
            _sleep(_BACKOFF[attempt - 1])
        try:
            r = client.post(URL, json=body, headers={"Authorization": f"Bearer {api_key}"})
        except httpx.TransportError as e:  # timeout, connection drop, DNS
            last = f"network error: {type(e).__name__}"
            continue
        if r.status_code == 429 or r.status_code >= 500:
            last = f"HTTP {r.status_code}"
            continue
        if r.status_code != 200:
            raise GenerationError(f"HTTP {r.status_code}: {r.text[:300]}")
        raw = _decode(r.json())
        cache_dir.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(raw)
        return raw
    raise GenerationError(f"gave up after 3 tries ({last})")
