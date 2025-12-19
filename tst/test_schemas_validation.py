import unittest

from pydantic import ValidationError

from src.backend.services.schemas import PasswordResetConfirm, VoteRequest
from src.backend.config.config_utils import read_config


class TestSchemasValidation(unittest.TestCase):
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
        public = read_config("public")
        self.assertIn("db_cfg", public)
        self.assertIn("crypto_cfg", public)

