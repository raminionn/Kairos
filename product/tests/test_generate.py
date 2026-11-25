import base64
import io
import json
import os

import httpx
import pytest
from PIL import Image

from product import generate
from product.generate import GenerationError, generate_image


def png_bytes(color=(255, 0, 0)):
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buf, "PNG")
    return buf.getvalue()


def ok_body(data=None):
    return {"data": [{"b64_json": base64.b64encode(data or png_bytes((0, 0, 255))).decode(), "media_type": "image/png"}]}


@pytest.fixture
def src(tmp_path):
    p = tmp_path / "src.png"
    p.write_bytes(png_bytes())
    return p


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test")
    monkeypatch.setattr(generate, "_sleep", lambda s: None)


def client_for(responses, calls):
    def handler(request):
        calls.append(request)
        status, body = responses[len(calls) - 1]
        return httpx.Response(status, json=body)

    return httpx.Client(transport=httpx.MockTransport(handler))


def call(src, tmp_path, client, key="v1-a0"):
    return generate_image("m/x", "a prompt", [src], key, tmp_path / "cache", aspect_ratio="4:5", client=client)


def test_returns_image_and_sends_reference(src, tmp_path):
    calls = []
    out = call(src, tmp_path, client_for([(200, ok_body())], calls))
    Image.open(io.BytesIO(out)).verify()
    body = json.loads(calls[0].content)
    assert calls[0].url == "https://openrouter.ai/api/v1/images"
    assert calls[0].headers["authorization"] == "Bearer test"
    assert body["model"] == "m/x" and body["prompt"] == "a prompt" and body["aspect_ratio"] == "4:5"
    assert body["input_references"][0]["image_url"]["url"].startswith("data:image/png;base64,")


def test_cache_hit_makes_no_request(src, tmp_path):
    calls = []
    c = client_for([(200, ok_body())], calls)
    first = call(src, tmp_path, c)
    second = call(src, tmp_path, c)
    assert first == second and len(calls) == 1


def test_different_key_is_a_new_request(src, tmp_path):
    calls = []
    c = client_for([(200, ok_body()), (200, ok_body())], calls)
    call(src, tmp_path, c, "v1-a0")
    call(src, tmp_path, c, "v1-a1")
    assert len(calls) == 2


def test_retries_429_then_succeeds(src, tmp_path):
    calls = []
    out = call(src, tmp_path, client_for([(429, {}), (429, {}), (200, ok_body())], calls))
    assert out and len(calls) == 3


def test_gives_up_after_3_tries(src, tmp_path):
    calls = []
    with pytest.raises(GenerationError):
        call(src, tmp_path, client_for([(503, {})] * 3, calls))
    assert len(calls) == 3


def test_400_raises_without_retry(src, tmp_path):
    calls = []
    with pytest.raises(GenerationError, match="400"):
        call(src, tmp_path, client_for([(400, {"error": "bad"})], calls))
    assert len(calls) == 1


def test_non_image_bytes_raise(src, tmp_path):
    with pytest.raises(GenerationError):
        call(src, tmp_path, client_for([(200, ok_body(b"hello"))], []))


def test_empty_data_raises(src, tmp_path):
    with pytest.raises(GenerationError):
        call(src, tmp_path, client_for([(200, {"data": []})], []))


def test_missing_key_raises(src, tmp_path, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY")
    calls = []
    with pytest.raises(GenerationError, match="OPENROUTER_API_KEY"):
        call(src, tmp_path, client_for([], calls))
    assert calls == []


@pytest.mark.api
def test_real_openrouter(src, tmp_path):
    model = os.environ.get("PRODUCT_TEST_MODEL", "google/gemini-2.5-flash-image")
    out = generate_image(model, "Place this red square on a wooden table, studio light.", [src], "api-test", tmp_path)
    Image.open(io.BytesIO(out)).verify()


def test_non_json_200_raises(src, tmp_path):
    def handler(request):
        return httpx.Response(200, text="<html>proxy error</html>")

    with pytest.raises(GenerationError):
        call(src, tmp_path, httpx.Client(transport=httpx.MockTransport(handler)))


def test_truncated_image_raises_and_is_not_cached(src, tmp_path):
    good = png_bytes((0, 0, 255))
    import numpy as np

    noise = (np.random.default_rng(0).random((256, 256, 3)) * 255).astype("uint8")
    buf = io.BytesIO()
    Image.fromarray(noise).save(buf, "JPEG")
    half = buf.getvalue()[: len(buf.getvalue()) // 2]  # Image.verify() accepts this; a full decode does not
    bad_calls, good_calls = [], []
    with pytest.raises(GenerationError):
        call(src, tmp_path, client_for([(200, ok_body(half))], bad_calls))
    out = call(src, tmp_path, client_for([(200, ok_body(good))], good_calls))
    assert out == good and len(good_calls) == 1  # bad bytes were not cached


@pytest.mark.parametrize("status", [401, 402])
def test_auth_and_credit_errors_are_fatal(src, tmp_path, status):
    with pytest.raises(generate.FatalGenerationError, match=str(status)):
        call(src, tmp_path, client_for([(status, {"error": "x"})], []))
