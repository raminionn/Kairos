from pathlib import Path
from typing import Type, TypeVar

from pydantic import BaseModel

M = TypeVar("M", bound=BaseModel)


def load_json(model: Type[M], path: Path) -> M:
    return model.model_validate_json(Path(path).read_text(encoding="utf-8"))


def save_json(obj: BaseModel, path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(obj.model_dump_json(indent=2) + "\n", encoding="utf-8")
    return path
