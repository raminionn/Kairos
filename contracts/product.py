"""File contracts for the product photo module (request.json -> result.json)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Category = Literal["fashion", "app", "product", "packaging"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProductRequest(_Strict):
    version: Literal[1] = 1
    category: Category
    image: str  # path relative to the request file's folder
    props: str | None = None
    n_variants: int = Field(3, ge=1, le=4)


class Checks(_Strict):
    """Gate scores. None = check does not apply (e.g. no text on the source)."""

    ocr_cer: float | None = None
    dino_sim: float | None = None
    delta_e: float | None = None
    silhouette_iou: float | None = None
    ssim: float | None = None


class Variant(_Strict):
    id: str
    path: str  # relative to the result file's folder
    attempts: int
    repaired: bool
    passed: bool
    checks: Checks
    fail_reasons: list[str]


class ProductResult(_Strict):
    version: Literal[1] = 1
    category: Category
    model: str
    reference_text: str
    variants: list[Variant]
