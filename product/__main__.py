"""python -m product <request.json> <result.json> [--config PATH]"""

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv

from product.generate import GenerationError
from product.run import ProductError, load_config, run


def main() -> None:
    p = argparse.ArgumentParser(prog="python -m product")
    p.add_argument("request", type=Path)
    p.add_argument("result", type=Path)
    p.add_argument("--config", type=Path)
    a = p.parse_args()
    load_dotenv(Path.cwd() / ".env")  # .env in the folder you run from
    config = load_config(a.config) if a.config else load_config()
    try:
        run(a.request, a.result, config)
    except (ProductError, GenerationError) as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
