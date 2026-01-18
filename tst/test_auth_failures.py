import asyncio
import unittest
from unittest.mock import patch

from fastapi import BackgroundTasks, HTTPException
from passlib.context import CryptContext

from src.database import models

from tst.test_support import import_backend_app_with_stubbed_db, make_sqlite_session_factory


class TestAuthFailures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        imported = import_backend_app_with_stubbed_db()
        cls.user_service = imported.user_service

    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_session_factory()
        models.Base.metadata.create_all(bind=self.engine)
        self.db = self.SessionLocal()

        self._pwd_context_patcher = patch(
            "src.backend.services.user_service.pwd_context",
            new=CryptContext(
                schemes=["argon2"],
                deprecated="auto",
                argon2__time_cost=1,
                argon2__memory_cost=1024,
                argon2__parallelism=1,
            ),
        )
        self._pwd_context_patcher.start()
        self.user_service._revoked_tokens.clear()  # type: ignore

    def tearDown(self):
        self.db.close()
        self._pwd_context_patcher.stop()

    def _mark_email_verified(self, username: str) -> None:
        user = self.db.query(models.User).filter(models.User.username == username).one()
        user.is_email_verified = True
        self.db.commit()

    def _register_verified_user(self, username: str) -> models.User:
        with patch(
            "src.backend.services.user_service.send_verification_email",
            autospec=True,
            side_effect=lambda *_args, **_kwargs: None,
        ):
            self.user_service.register_user(  # type: ignore
                user_in=self.user_service.UserCreate(  # type: ignore
                    username=username,
                    password="password123",
                    email=f"{username}@example.com",
                ),
                background_tasks=BackgroundTasks(),
                db=self.db,
            )
        self._mark_email_verified(username)
        return self.db.query(models.User).filter(models.User.username == username).one()

    def _login_and_get_token(self, username: str) -> str:
        form = self.user_service.OAuth2PasswordRequestForm(  # type: ignore
            username=username,
            password="password123",
            scope="",
            client_id=None,
            client_secret=None,
        )
        return self.user_service.login(form_data=form, db=self.db).access_token  # type: ignore

    def test_invalid_token_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(self.user_service.get_current_user(token="not-a-token", db=self.db))  # type: ignore
        self.assertEqual(ctx.exception.status_code, 401)

    def test_token_without_sub_rejected(self):
        token = self.user_service.create_token({"foo": "bar"})  # type: ignore
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(self.user_service.get_current_user(token=token, db=self.db))  # type: ignore
        self.assertEqual(ctx.exception.status_code, 401)

    def test_token_for_nonexistent_user_rejected(self):
        token = self.user_service.create_token({"sub": "missing-user"})  # type: ignore
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(self.user_service.get_current_user(token=token, db=self.db))  # type: ignore
        self.assertEqual(ctx.exception.status_code, 404)

    def test_revoked_token_rejected(self):
        self._register_verified_user("alice")
        token = self._login_and_get_token("alice")
        current_user = asyncio.run(self.user_service.get_current_user(token=token, db=self.db))  # type: ignore

        asyncio.run(self.user_service.logout(token=token, current_user=current_user))  # type: ignore

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(self.user_service.get_current_user(token=token, db=self.db))  # type: ignore
        self.assertEqual(ctx.exception.status_code, 401)

