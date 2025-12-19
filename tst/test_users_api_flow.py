import unittest
from unittest.mock import patch

import asyncio
from fastapi import BackgroundTasks, HTTPException
from passlib.context import CryptContext

from src.database import models

from tst.test_support import import_backend_app_with_stubbed_db, make_sqlite_session_factory


class TestUsersApiFlow(unittest.TestCase):
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

        self.user_service._revoked_tokens.clear()

    def tearDown(self):
        self.db.close()
        self._pwd_context_patcher.stop()

    def _mark_email_verified(self, username: str) -> None:
        user = self.db.query(models.User).filter(models.User.username == username).one()
        user.is_email_verified = True
        self.db.commit()

    def test_register_then_login_then_me(self):
        with patch(
            "src.backend.services.user_service.send_verification_email",
            autospec=True,
            side_effect=lambda *_args, **_kwargs: None,
        ):
            bg = BackgroundTasks()
            created = self.user_service.register_user(
                user_in=self.user_service.UserCreate(
                    username="alice",
                    password="password123",
                    email="alice@example.com",
                ),
                background_tasks=bg,
                db=self.db,
            )

        self.assertEqual(len(bg.tasks), 1)
        self.assertEqual(created.username, "alice")
        self._mark_email_verified("alice")

        form = self.user_service.OAuth2PasswordRequestForm(
            username="alice",
            password="password123",
            scope="",
            client_id=None,
            client_secret=None,
        )
        token = self.user_service.login(form_data=form, db=self.db).access_token

        current_user = asyncio.run(
            self.user_service.get_current_user(token=token, db=self.db)
        )
        self.assertEqual(current_user.username, "alice")

        asyncio.run(self.user_service.logout(token=token, current_user=current_user))
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(self.user_service.get_current_user(token=token, db=self.db))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_login_requires_verified_email(self):
        with patch(
            "src.backend.services.user_service.send_verification_email",
            autospec=True,
            side_effect=lambda *_args, **_kwargs: None,
        ):
            self.user_service.register_user(
                user_in=self.user_service.UserCreate(
                    username="bob",
                    password="password123",
                    email="bob@example.com",
                ),
                background_tasks=BackgroundTasks(),
                db=self.db,
            )

        form = self.user_service.OAuth2PasswordRequestForm(
            username="bob",
            password="password123",
            scope="",
            client_id=None,
            client_secret=None,
        )
        with self.assertRaises(HTTPException) as ctx:
            self.user_service.login(form_data=form, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
