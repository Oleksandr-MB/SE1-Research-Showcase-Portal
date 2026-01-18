import asyncio
import json
import unittest
from unittest.mock import patch

from fastapi import BackgroundTasks, HTTPException
from passlib.context import CryptContext

from src.database import models

from tst.test_support import import_backend_app_with_stubbed_db, make_sqlite_session_factory


class TestReviewPermissionsAndAutoPromotion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        imported = import_backend_app_with_stubbed_db()
        cls.user_service = imported.user_service
        cls.post_service = imported.post_service
        cls.review_service = imported.review_service

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

    def _create_post(self, current_user: models.User) -> models.Post:
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
        return self.db.query(models.Post).filter(models.Post.id == created.id).one()

    def _create_review(self, post_id: int, current_user: models.User, is_positive: bool):
        return asyncio.run(
            self.review_service.create_review(  # type: ignore
                post_id=post_id,
                review_data=self.review_service.ReviewCreate(  # type: ignore
                    body="Review body",
                    is_positive=is_positive,
                    strengths="Strengths",
                    weaknesses="Weaknesses",
                ),
                current_user=current_user,
                db=self.db,
            )
        )

    def test_simple_user_cannot_create_review(self):
        poster = self._register_user("alice")
        reviewer = self._register_user("bob")

        post = self._create_post(poster)

        with self.assertRaises(HTTPException) as ctx:
            self._create_review(post_id=post.id, current_user=reviewer, is_positive=True)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_researcher_cannot_review_own_post(self):
        poster = self._register_user("alice")
        poster.role = models.UserRole.RESEARCHER
        self.db.commit()
        self.db.refresh(poster)

        post = self._create_post(poster)

        with self.assertRaises(HTTPException) as ctx:
            self._create_review(post_id=post.id, current_user=poster, is_positive=True)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_duplicate_review_rejected(self):
        poster = self._register_user("alice")
        reviewer = self._register_user("bob")
        reviewer.role = models.UserRole.RESEARCHER
        self.db.commit()
        self.db.refresh(reviewer)

        post = self._create_post(poster)

        self._create_review(post_id=post.id, current_user=reviewer, is_positive=True)
        with self.assertRaises(HTTPException) as ctx:
            self._create_review(post_id=post.id, current_user=reviewer, is_positive=False)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_auto_promotion_after_three_positive_reviews(self):
        poster = self._register_user("alice")
        self.assertEqual(poster.role, models.UserRole.USER)

        post = self._create_post(poster)

        reviewers = []
        for username in ("r1", "r2", "r3"):
            user = self._register_user(username)
            user.role = models.UserRole.RESEARCHER
            reviewers.append(user)
        self.db.commit()

        for reviewer in reviewers:
            self._create_review(post_id=post.id, current_user=reviewer, is_positive=True)

        updated_poster = self.db.query(models.User).filter(models.User.id == poster.id).one()
        self.assertEqual(updated_poster.role, models.UserRole.RESEARCHER)

