import unittest
from unittest.mock import patch

from fastapi import BackgroundTasks, HTTPException
from passlib.context import CryptContext

from src.database import models
from src.backend.services.schemas import PromotionRequest

from tst.test_support import import_backend_app_with_stubbed_db, make_sqlite_session_factory


class TestUserPromotionPermissions(unittest.TestCase):
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

    def _register_user(self, username: str) -> models.User:
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

    def test_only_moderator_can_promote_or_demote(self):
        target = self._register_user("alice")
        requester = self._register_user("bob")
        moderator = self._register_user("mod")
        moderator.role = models.UserRole.MODERATOR
        self.db.commit()
        self.db.refresh(moderator)

        with self.assertRaises(HTTPException) as ctx:
            self.user_service.promote_user(  # type: ignore
                username=target.username,
                payload=PromotionRequest(role=models.UserRole.RESEARCHER),
                db=self.db,
                requester=requester,
            )
        self.assertEqual(ctx.exception.status_code, 403)

        promoted = self.user_service.promote_user(  # type: ignore
            username=target.username,
            payload=PromotionRequest(role=models.UserRole.RESEARCHER),
            db=self.db,
            requester=moderator,
        )
        self.assertEqual(promoted.role, models.UserRole.RESEARCHER)

        demoted = self.user_service.promote_user(  # type: ignore
            username=target.username,
            payload=PromotionRequest(role=models.UserRole.USER),
            db=self.db,
            requester=moderator,
        )
        self.assertEqual(demoted.role, models.UserRole.USER)

