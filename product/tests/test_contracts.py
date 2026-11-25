from pathlib import Path

import pytest
from pydantic import ValidationError

from contracts.product import ProductRequest, ProductResult


def test_fixtures_validate():
    ProductRequest.model_validate_json(Path("fixtures/product.request.json").read_text())
    ProductResult.model_validate_json(Path("fixtures/product.result.json").read_text())


def test_unknown_category_rejected():
    with pytest.raises(ValidationError):
        ProductRequest(category="shoes", image="a.jpg")


def test_extra_field_rejected():
    with pytest.raises(ValidationError):
        ProductRequest(category="app", image="a.png", style="x")
