import os
import runpy
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

from src.backend.config.config_utils import read_config


class TestConfigAndMainCoverage(unittest.TestCase):
    def test_read_config_missing_optional_returns_default(self):
        self.assertEqual(read_config("__does_not_exist__", required=False), {})
        self.assertEqual(
            read_config("__does_not_exist__", required=False, default={"x": 1}),
            {"x": 1},
        )

    def test_read_config_missing_required_raises(self):
        with self.assertRaises(FileNotFoundError):
            read_config("__does_not_exist__", required=True)

    def test_read_config_non_mapping_raises(self):
        config_dir = Path(__file__).resolve().parents[1] / "src" / "backend" / "config"
        cfg_path = config_dir / "__bad_type__.yaml"
        try:
            cfg_path.write_text("- 1\n- 2\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                read_config("__bad_type__")
        finally:
            try:
                os.remove(cfg_path)
            except FileNotFoundError:
                pass

    def test_read_config_empty_file_returns_default(self):
        config_dir = Path(__file__).resolve().parents[1] / "src" / "backend" / "config"
        cfg_path = config_dir / "__empty__.yaml"
        try:
            cfg_path.write_text("", encoding="utf-8")
            self.assertEqual(read_config("__empty__", required=False), {})
            self.assertEqual(
                read_config("__empty__", required=False, default={"ok": True}),
                {"ok": True},
            )
        finally:
            try:
                os.remove(cfg_path)
            except FileNotFoundError:
                pass

    def test_main_module_runs_uvicorn_in_main_guard(self):
        import sys
        import types

        fake_uvicorn = SimpleNamespace(run=Mock())
        fake_db = types.ModuleType("src.database.db")

        def get_db():  # pragma: no cover
            raise RuntimeError("Test must override dependency `get_db`.")

        fake_db.get_db = get_db

        try:
            sys.modules["uvicorn"] = fake_uvicorn  # type: ignore
            sys.modules["src.database.db"] = fake_db
            sys.modules.pop("src.backend.main", None)
            runpy.run_module("src.backend.main", run_name="__main__")
        finally:
            sys.modules.pop("uvicorn", None)
            sys.modules.pop("src.database.db", None)

        self.assertTrue(fake_uvicorn.run.called)
