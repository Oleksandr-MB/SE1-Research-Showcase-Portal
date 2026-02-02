from __future__ import annotations

import os
from typing import Any


def _env_str(key: str) -> str | None:
    value = os.getenv(key)
    if value is None:
        return None
    value = value.strip()
    return value if value else None


def _env_int(key: str) -> int | None:
    value = _env_str(key)
    if value is None:
        return None
    return int(value)


def _env_list(key: str) -> list[str] | None:
    value = _env_str(key)
    if value is None:
        return None
    value = value.strip()
    if value.startswith("[") and value.endswith("]"):
        value = value[1:-1]
    parts = [
        part.strip().strip("'\"")
        for part in value.split(",")
        if part.strip().strip("'\"")
    ]
    return parts or None


_CONFIG_KEYS: tuple[str, ...] = (
    "RSP_DB_BASE",
    "RSP_DB_HOST",
    "RSP_DB_PORT",
    "RSP_DB_DATABASE",
    "RSP_DB_USER",
    "RSP_DB_PASSWORD",
    "RSP_EMAIL_LINK_BASE",
    "RSP_EMAIL_RESET_LINK_BASE",
    "RSP_CRYPTO_KEY",
    "RSP_CRYPTO_ALGORITHM",
    "RSP_TOKEN_ACCESS_EXPIRE_MINUTES",
    "RSP_TOKEN_EMAIL_EXPIRE_MINUTES",
    "RSP_SCHED_DELETE_EXPIRED_USERS_INTERVAL_MINUTES",
    "RSP_SMTP_SERVER",
    "RSP_SMTP_PORT",
    "RSP_SMTP_SENDER",
    "RSP_SMTP_PASSWORD",
    "RSP_MODERATOR_EMAILS",
)

_REQUIRED_KEYS: tuple[str, ...] = (
    "RSP_DB_BASE",
    "RSP_DB_HOST",
    "RSP_DB_PORT",
    "RSP_DB_DATABASE",
    "RSP_DB_USER",
    "RSP_DB_PASSWORD",
    "RSP_CRYPTO_KEY",
    "RSP_CRYPTO_ALGORITHM",
    "RSP_TOKEN_ACCESS_EXPIRE_MINUTES",
    "RSP_TOKEN_EMAIL_EXPIRE_MINUTES",
    "RSP_SCHED_DELETE_EXPIRED_USERS_INTERVAL_MINUTES",
    "RSP_EMAIL_LINK_BASE",
    "RSP_EMAIL_RESET_LINK_BASE",
)


def read_config(*, default: dict[str, Any] | None = None, required: bool = True) -> dict[str, Any]:

    cfg: dict[str, Any] = dict(default or {})

    for key in _CONFIG_KEYS:
        if key in (
            "RSP_DB_PORT",
            "RSP_TOKEN_ACCESS_EXPIRE_MINUTES",
            "RSP_TOKEN_EMAIL_EXPIRE_MINUTES",
            "RSP_SCHED_DELETE_EXPIRED_USERS_INTERVAL_MINUTES",
            "RSP_SMTP_PORT",
        ):
            value = _env_int(key)
        elif key == "RSP_MODERATOR_EMAILS":
            value = _env_list(key)
        else:
            value = _env_str(key)

        if value is not None:
            cfg[key] = value

    if required:
        missing = [key for key in _REQUIRED_KEYS if cfg.get(key) is None]
        if missing:
            raise FileNotFoundError("Missing required env vars: " + ", ".join(missing) + " (see src/backend/config/example.env)")

    return cfg
