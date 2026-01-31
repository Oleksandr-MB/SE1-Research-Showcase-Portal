from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


def read_config(
    name: str,
    *,
    default: dict[str, Any] | None = None,
    required: bool = True,
) -> dict[str, Any]:
    config_dir = Path(__file__).resolve().parent
    cfg_path = config_dir / f"{name}.yaml"

    try:
        with cfg_path.open("r", encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
    except FileNotFoundError:
        if required:
            raise
        return default or {}

    if loaded is None:
        return default or {}
    if not isinstance(loaded, dict):
        raise ValueError(f"Config file must contain a mapping: {cfg_path}")
    return loaded
