from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any

import yaml


def _load_yaml_mapping_from_path(
    path: Path,
    *,
    default: dict[str, Any] | None = None,
    required: bool = True,
) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
    except FileNotFoundError:
        if required:
            raise
        return default or {}

    if loaded is None:
        return default or {}
    if not isinstance(loaded, dict):
        raise ValueError(f"Config file must contain a mapping: {path}")
    return loaded


def read_config(
    name: str,
    *,
    default: dict[str, Any] | None = None,
    required: bool = True,
) -> dict[str, Any]:
    config_dir = Path(__file__).resolve().parent
    cfg_path = config_dir / f"{name}.yaml"
    return _load_yaml_mapping_from_path(cfg_path, default=default, required=required)


def _deep_merge_dicts(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged: dict[str, Any] = dict(base)
    for key, value in override.items():
        if (
            key in merged
            and isinstance(merged[key], dict)
            and isinstance(value, dict)
        ):
            merged[key] = _deep_merge_dicts(merged[key], value)
        else:
            merged[key] = value
    return merged


def _load_yaml_mapping_from_text(text: str, *, origin: str) -> dict[str, Any]:
    loaded = yaml.safe_load(text)
    if loaded is None:
        return {}
    if not isinstance(loaded, dict):
        raise ValueError(f"Config must contain a mapping: {origin}")
    return loaded


def _running_on_azure_app_service() -> bool:
    # Common env vars present on Azure App Service.
    return bool(os.getenv("WEBSITE_INSTANCE_ID") or os.getenv("WEBSITE_SITE_NAME"))


def read_app_config(*, config_dir: Path | None = None) -> dict[str, Any]:
    """
    Returns the merged runtime config.

    Precedence:
    1) `APP_CONFIG_YAML_B64` (base64-encoded YAML mapping)
    2) `APP_CONFIG_YAML` (raw YAML mapping)
    3) `config.yaml` in the config directory
    4) Merge of `public.yaml` + optional `private.yaml` in the config directory
    """
    config_dir = config_dir or Path(__file__).resolve().parent

    # Keep local behavior identical to the previous setup by default:
    # local runs use public.yaml + private.yaml. Cloud (Azure App Service) can
    # switch to a single secret-backed config.
    enable_single_config = _running_on_azure_app_service() or os.getenv("APP_CONFIG_ENABLE") == "1"

    config_path = config_dir / "config.yaml"
    env_b64 = os.getenv("APP_CONFIG_YAML_B64")
    env_yaml = os.getenv("APP_CONFIG_YAML")

    if enable_single_config:
        if env_b64:
            decoded = base64.b64decode(env_b64).decode("utf-8")
            return _load_yaml_mapping_from_text(decoded, origin="APP_CONFIG_YAML_B64")

        if env_yaml:
            return _load_yaml_mapping_from_text(env_yaml, origin="APP_CONFIG_YAML")

        if config_path.exists():
            return _load_yaml_mapping_from_path(config_path, default={}, required=True)

    public_cfg = _load_yaml_mapping_from_path(
        config_dir / "public.yaml", default={}, required=True
    )
    private_cfg = _load_yaml_mapping_from_path(
        config_dir / "private.yaml", default={}, required=False
    )
    return _deep_merge_dicts(public_cfg, private_cfg)
