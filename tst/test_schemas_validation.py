import unittest
import os

from pydantic import ValidationError

from src.backend.services.schemas import PasswordResetConfirm, VoteRequest
from src.backend.config.config_utils import read_config


class TestSchemasValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
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

    def test_vote_request_rejects_invalid_values(self):
        with self.assertRaises(ValidationError):
            VoteRequest(value=2)

        with self.assertRaises(ValidationError):
            VoteRequest(value=-2)

    def test_vote_request_accepts_valid_values(self):
        for value in (-1, 0, 1):
            parsed = VoteRequest(value=value)
            self.assertEqual(parsed.value, value)

    def test_password_reset_confirm_enforces_min_length(self):
        with self.assertRaises(ValidationError):
            PasswordResetConfirm(token="t", new_password="short")

        ok = PasswordResetConfirm(token="t", new_password="long-enough")
        self.assertEqual(ok.new_password, "long-enough")

    def test_read_config_returns_expected_shape(self):
        cfg = read_config()
        self.assertIn("RSP_DB_HOST", cfg)
        self.assertIn("RSP_CRYPTO_KEY", cfg)
