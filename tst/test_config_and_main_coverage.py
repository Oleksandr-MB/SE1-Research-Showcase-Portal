import os
import runpy
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from unittest.mock import Mock

from src.backend.config.config_utils import read_config


class TestConfigAndMainCoverage(unittest.TestCase):
    def test_read_config_private_missing_optional_returns_default(self):
        self.assertEqual(read_config("private", required=False), {})
        self.assertEqual(read_config("private", required=False, default={"x": 1}), {"x": 1})

    def test_read_config_unknown_required_raises(self):
        with self.assertRaises(FileNotFoundError):
            read_config("__does_not_exist__", required=True)

    def test_read_config_public_missing_raises(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(FileNotFoundError):
                read_config("public")

    def test_read_config_public_env_requires_db_triplet(self):
        with patch.dict(os.environ, {"RSP_DB_HOST": "example"}, clear=True):
            with self.assertRaises(ValueError):
                read_config("public")

    def test_read_config_public_env_overrides_defaults(self):
        env = {
            "RSP_DB_BASE": "postgresql+psycopg2",
            "RSP_DB_HOST": "db.example",
            "RSP_DB_USER": "u",
            "RSP_DB_PASSWORD": "p",
            "RSP_DB_PORT": "5433",
            "RSP_DB_DATABASE": "d",
            "RSP_EMAIL_LINK_BASE": "https://front/verify-email?token=",
            "RSP_EMAIL_RESET_LINK_BASE": "https://front/reset-password?token=",
            "RSP_CRYPTO_KEY": "k",
            "RSP_CRYPTO_ALGORITHM": "HS256",
            "RSP_TOKEN_ACCESS_EXPIRE_MINUTES": "60",
            "RSP_TOKEN_EMAIL_EXPIRE_MINUTES": "30",
            "RSP_SCHED_DELETE_EXPIRED_USERS_INTERVAL_MINUTES": "60",
        }
        with patch.dict(os.environ, env, clear=False):
            cfg = read_config("public")
        self.assertEqual(cfg["db_cfg"]["host"], "db.example")
        self.assertEqual(cfg["db_cfg"]["port"], 5433)
        self.assertEqual(cfg["email_cfg"]["link_base"], "https://front/verify-email?token=")

    def test_main_module_runs_uvicorn_in_main_guard(self):
        import sys
        import types

        fake_uvicorn = SimpleNamespace(run=Mock())
        fake_db = types.ModuleType("src.database.db")

        def get_db():  # pragma: no cover
            raise RuntimeError("Test must override dependency `get_db`.")

        fake_db.get_db = get_db # type: ignore

        try:
            sys.modules["uvicorn"] = fake_uvicorn  # type: ignore
            sys.modules["src.database.db"] = fake_db
            sys.modules.pop("src.backend.main", None)
            runpy.run_module("src.backend.main", run_name="__main__")
        finally:
            sys.modules.pop("uvicorn", None)
            sys.modules.pop("src.database.db", None)

        self.assertTrue(fake_uvicorn.run.called)
