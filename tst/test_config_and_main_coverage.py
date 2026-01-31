import os
import runpy
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import Mock, patch

from src.backend.config.config_utils import read_app_config, read_config


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

    def test_read_app_config_merges_public_and_private(self):
        with TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            (tmp_path / "public.yaml").write_text(
                "db_cfg:\n  base: postgresql+psycopg2\n  user: u\n  password: p\n  host: h\n  port: 5432\n  database: d\n",
                encoding="utf-8",
            )
            (tmp_path / "private.yaml").write_text(
                "smtp_cfg:\n  sender: sender@example.com\nmoderator_emails:\n  - mod@example.com\n",
                encoding="utf-8",
            )

            merged = read_app_config(config_dir=tmp_path)
            self.assertEqual(merged["db_cfg"]["database"], "d")
            self.assertEqual(merged["smtp_cfg"]["sender"], "sender@example.com")
            self.assertEqual(merged["moderator_emails"], ["mod@example.com"])

    def test_read_app_config_env_overrides_files(self):
        with TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            (tmp_path / "public.yaml").write_text("db_cfg: {}\n", encoding="utf-8")

            with patch.dict(
                os.environ,
                {"APP_CONFIG_ENABLE": "1", "APP_CONFIG_YAML": "hello: world\n"},
            ):
                cfg = read_app_config(config_dir=tmp_path)
            self.assertEqual(cfg["hello"], "world")

    def test_main_module_runs_uvicorn_in_main_guard(self):
        fake_uvicorn = SimpleNamespace(run=Mock())
        try:
            import sys

            sys.modules["uvicorn"] = fake_uvicorn # type: ignore
            runpy.run_module("src.backend.main", run_name="__main__")
        finally:
            import sys

            sys.modules.pop("uvicorn", None)

        self.assertTrue(fake_uvicorn.run.called)
