from __future__ import annotations

import os
from typing import Any


def _env(key: str) -> str | None:
    value = os.getenv(key)
    if value is None:
        return None
    value = value.strip()
    return value if value else None


def _env_int(key: str) -> int | None:
    value = _env(key)
    if value is None:
        return None
    return int(value)


def _env_list(key: str) -> list[str] | None:
    value = _env(key)
    if value is None:
        return None
    return [part.strip() for part in value.split(",") if part.strip()]


def _read_public_config_from_env() -> dict[str, Any] | None:
    # If any of the DB env vars are set, treat env mode as active.
    any_set = any(
        _env(k) is not None
        for k in (
            "RSP_DB_HOST",
            "RSP_DB_USER",
            "RSP_DB_PASSWORD",
            "RSP_DB_DATABASE",
        )
    )
    if not any_set:
        return None

    cfg: dict[str, Any] = {
        "email_cfg": {
            "link_base": _env("RSP_EMAIL_LINK_BASE"),
            "reset_link_base": _env("RSP_EMAIL_RESET_LINK_BASE"),
        },
        "db_cfg": {
            "base": _env("RSP_DB_BASE"),
            "user": _env("RSP_DB_USER"),
            "host": _env("RSP_DB_HOST"),
            "password": _env("RSP_DB_PASSWORD"),
            "port": _env_int("RSP_DB_PORT"),
            "database": _env("RSP_DB_DATABASE"),
        },
        "crypto_cfg": {
            "key": _env("RSP_CRYPTO_KEY"),
            "algorithm": _env("RSP_CRYPTO_ALGORITHM"),
        },
        "token_cfg": {
            "access_token_expire_minutes": _env_int("RSP_TOKEN_ACCESS_EXPIRE_MINUTES"),
            "email_token_expire_minutes": _env_int("RSP_TOKEN_EMAIL_EXPIRE_MINUTES"),
        },
        "scheduler_cfg": {
            "delete_expired_users_interval_minutes": _env_int(
                "RSP_SCHED_DELETE_EXPIRED_USERS_INTERVAL_MINUTES"
            ),
        },
    }

    required_keys = (
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
    missing = [key for key in required_keys if _env(key) is None]
    if missing:
        raise ValueError(
            "Missing required env vars for config: " + ", ".join(missing)
        )

    return cfg


def _read_private_config_from_env() -> dict[str, Any] | None:
    any_set = any(
        _env(k) is not None
        for k in (
            "RSP_SMTP_SERVER",
            "RSP_SMTP_SENDER",
            "RSP_SMTP_PASSWORD",
            "RSP_MODERATOR_EMAILS",
        )
    )
    if not any_set:
        return None

    return {
        "smtp_cfg": {
            "smtp_server": _env("RSP_SMTP_SERVER"),
            "smtp_port": _env_int("RSP_SMTP_PORT"),
            "sender": _env("RSP_SMTP_SENDER"),
            "password": _env("RSP_SMTP_PASSWORD"),
        },
        "moderator_emails": _env_list("RSP_MODERATOR_EMAILS"),
    }


def _drop_nones(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: _drop_nones(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [_drop_nones(v) for v in value]
    return value


def read_config(
    name: str,
    *,
    default: dict[str, Any] | None = None,
    required: bool = True,
) -> dict[str, Any]:
    if name == "public":
        env_cfg = _read_public_config_from_env()
        if env_cfg is not None:
            return _drop_nones(env_cfg)
        if required:
            raise FileNotFoundError(
                "Missing public config: set RSP_* environment variables (see config/local.env.example)"
            )
        return default or {}

    if name == "private":
        env_cfg = _read_private_config_from_env()
        if env_cfg is not None:
            return _drop_nones(env_cfg)
        return default or {}

    if required:
        raise FileNotFoundError(f"Unsupported config name: {name}")
    return default or {}
