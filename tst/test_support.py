from __future__ import annotations

import importlib
import os
import sys
import types
from dataclasses import dataclass

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@dataclass(frozen=True)
class ImportedBackend:
    app: object
    user_service: object
    post_service: object
    review_service: object
    report_service: object


def ensure_repo_root_on_path() -> None:
    repo_root = os.path.abspath(os.getcwd())
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)


def import_backend_app_with_stubbed_db() -> ImportedBackend:
    """
    Imports the FastAPI app after stubbing `src.database.db` so tests do not
    attempt to connect to Postgres at import time.
    """
    ensure_repo_root_on_path()

    os.environ.setdefault("RSP_DB_BASE", "postgresql+psycopg2")
    os.environ.setdefault("RSP_DB_HOST", "localhost")
    os.environ.setdefault("RSP_DB_PORT", "5432")
    os.environ.setdefault("RSP_DB_DATABASE", "research_showcase")
    os.environ.setdefault("RSP_DB_USER", "postgres")
    os.environ.setdefault("RSP_DB_PASSWORD", "admin")
    os.environ.setdefault(
        "RSP_EMAIL_LINK_BASE", "http://localhost:3000/verify-email?token="
    )
    os.environ.setdefault(
        "RSP_EMAIL_RESET_LINK_BASE", "http://localhost:3000/reset-password?token="
    )
    os.environ.setdefault("RSP_CRYPTO_KEY", "test-secret")
    os.environ.setdefault("RSP_CRYPTO_ALGORITHM", "HS256")
    os.environ.setdefault("RSP_TOKEN_ACCESS_EXPIRE_MINUTES", "60")
    os.environ.setdefault("RSP_TOKEN_EMAIL_EXPIRE_MINUTES", "30")
    os.environ.setdefault("RSP_SCHED_DELETE_EXPIRED_USERS_INTERVAL_MINUTES", "60")

    modules_to_clear = [
        "src.backend.main",
        "src.backend.services.user_service",
        "src.backend.services.post_service",
        "src.backend.services.review_service",
        "src.backend.services.report_service",
        "src.database.db",
    ]
    for module_name in modules_to_clear:
        sys.modules.pop(module_name, None)

    fake_db = types.ModuleType("src.database.db")

    def get_db():  # pragma: no cover - should always be overridden in tests
        raise RuntimeError("Test must override dependency `get_db`.")

    fake_db.get_db = get_db
    sys.modules["src.database.db"] = fake_db

    main = importlib.import_module("src.backend.main")
    user_service = importlib.import_module("src.backend.services.user_service")
    post_service = importlib.import_module("src.backend.services.post_service")
    review_service = importlib.import_module("src.backend.services.review_service")
    report_service = importlib.import_module("src.backend.services.report_service")

    return ImportedBackend(
        app=main.app,
        user_service=user_service,
        post_service=post_service,
        review_service=review_service,
        report_service=report_service,
    )


def make_sqlite_session_factory():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    SessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        future=True,
    )
    return engine, SessionLocal
