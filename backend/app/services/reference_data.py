"""Loads the sample brand reference data (JSON seed file for the MVP)."""
import json
from functools import lru_cache
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "sample_reference.json"


@lru_cache(maxsize=1)
def _load() -> dict:
    with DATA_FILE.open(encoding="utf-8") as f:
        return json.load(f)


def get_sample_reference() -> dict:
    return _load()
