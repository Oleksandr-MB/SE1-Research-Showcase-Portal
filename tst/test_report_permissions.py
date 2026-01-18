import asyncio
import json
import unittest
from unittest.mock import patch

from fastapi import BackgroundTasks, HTTPException
from passlib.context import CryptContext

from src.database import models
from src.backend.services.schemas import ReportStatusUpdate

from tst.test_support import import_backend_app_with_stubbed_db, make_sqlite_session_factory


class TestReportPermissions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        imported = import_backend_app_with_stubbed_db()
        cls.user_service = imported.user_service
        cls.post_service = imported.post_service
        cls.report_service = imported.report_service

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

    def _create_post(self, current_user: models.User) -> int:
        raw_body = json.dumps(
            {
                "title": "Post",
                "authors_text": current_user.display_name or current_user.username,
                "abstract": "Abstract",
                "body": "Body",
            }
        )
        created = asyncio.run(
            self.post_service.create_research_post(  # type: ignore
                raw_body=raw_body,
                db=self.db,
                current_user=current_user,
            )
        )
        return created.id

    def test_only_moderator_can_list_and_update_reports(self):
        poster = self._register_user("alice")
        reporter = self._register_user("bob")
        moderator = self._register_user("mod")
        moderator.role = models.UserRole.MODERATOR
        self.db.commit()
        self.db.refresh(moderator)

        post_id = self._create_post(poster)

        report = self.post_service.create_report_for_post(  # type: ignore
            post_id=post_id,
            payload=self.post_service.ReportCreate(description="Spam"),  # type: ignore
            db=self.db,
            current_user=reporter,
        )

        with self.assertRaises(HTTPException) as ctx:
            self.report_service.get_all_reports(db=self.db, current_user=reporter)  # type: ignore
        self.assertEqual(ctx.exception.status_code, 403)

        listed = self.report_service.get_all_reports(db=self.db, current_user=moderator)  # type: ignore
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0].id, report.id)

        with self.assertRaises(HTTPException) as ctx:
            self.report_service.update_report_status(  # type: ignore
                report_id=report.id,
                payload=ReportStatusUpdate(status="not-a-status"),
                db=self.db,
                current_user=moderator,
            )
        self.assertEqual(ctx.exception.status_code, 400)

        updated = self.report_service.update_report_status(  # type: ignore
            report_id=report.id,
            payload=ReportStatusUpdate(status="closed"),
            db=self.db,
            current_user=moderator,
        )
        self.assertEqual(updated.status, models.ReportStatus.CLOSED)

    def test_user_cannot_report_own_post(self):
        poster = self._register_user("alice")
        post_id = self._create_post(poster)

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.create_report_for_post(  # type: ignore
                post_id=post_id,
                payload=self.post_service.ReportCreate(description="Spam"),  # type: ignore
                db=self.db,
                current_user=poster,
            )
        self.assertEqual(ctx.exception.status_code, 400)
