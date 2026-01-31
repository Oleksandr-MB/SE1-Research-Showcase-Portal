import asyncio
import json
import unittest
from unittest.mock import patch

from fastapi import BackgroundTasks, HTTPException
from passlib.context import CryptContext

from src.database import models

from tst.test_support import import_backend_app_with_stubbed_db, make_sqlite_session_factory


class TestReviewServiceVotesAndReads(unittest.TestCase):
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

    def _create_post(self, poster: models.User) -> models.Post:
        raw_body = json.dumps(
            {
                "title": "Post",
                "authors_text": poster.username,
                "abstract": "Abstract",
                "body": "Body",
            }
        )
        created = asyncio.run(
            self.post_service.create_research_post(  # type: ignore
                raw_body=raw_body,
                db=self.db,
                current_user=poster,
            )
        )
        return self.db.query(models.Post).filter(models.Post.id == created.id).one()

    def test_create_review_post_not_found(self):
        reviewer = self._register_user("reviewer")
        reviewer.role = models.UserRole.RESEARCHER
        self.db.commit()
        self.db.refresh(reviewer)

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(
                self.review_service.create_review(  # type: ignore
                    post_id=999,
                    review_data=self.review_service.ReviewCreate(  # type: ignore
                        body="Body",
                        is_positive=True,
                        strengths="S",
                        weaknesses="W",
                    ),
                    current_user=reviewer,
                    db=self.db,
                )
            )
        self.assertEqual(ctx.exception.status_code, 404)

    def test_get_post_reviews_and_get_review(self):
        poster = self._register_user("poster")
        reviewer = self._register_user("reviewer")
        reviewer.role = models.UserRole.RESEARCHER
        self.db.commit()
        self.db.refresh(reviewer)

        post = self._create_post(poster)

        created = asyncio.run(
            self.review_service.create_review(  # type: ignore
                post_id=post.id,
                review_data=self.review_service.ReviewCreate(  # type: ignore
                    body="Review",
                    is_positive=True,
                    strengths="S",
                    weaknesses="W",
                ),
                current_user=reviewer,
                db=self.db,
            )
        )

        listed = asyncio.run(self.review_service.get_post_reviews(post.id, db=self.db))  # type: ignore
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0].id, created.id)

        fetched = asyncio.run(self.review_service.get_review(created.id, db=self.db))  # type: ignore
        self.assertEqual(fetched.id, created.id)

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(self.review_service.get_review(999, db=self.db))  # type: ignore
        self.assertEqual(ctx.exception.status_code, 404)

    def test_vote_on_review_add_update_delete(self):
        poster = self._register_user("poster")
        reviewer = self._register_user("reviewer")
        voter = self._register_user("voter")
        reviewer.role = models.UserRole.RESEARCHER
        self.db.commit()
        self.db.refresh(reviewer)

        post = self._create_post(poster)
        created = asyncio.run(
            self.review_service.create_review(  # type: ignore
                post_id=post.id,
                review_data=self.review_service.ReviewCreate(  # type: ignore
                    body="Review",
                    is_positive=True,
                    strengths="S",
                    weaknesses="W",
                ),
                current_user=reviewer,
                db=self.db,
            )
        )

        out = asyncio.run(
            self.review_service.vote_on_review(  # type: ignore
                review_id=created.id,
                vote=self.review_service.VoteRequest(value=1),  # type: ignore
                db=self.db,
                current_user=voter,
            )
        )
        self.assertEqual(out.upvotes, 1)

        out = asyncio.run(
            self.review_service.vote_on_review(  # type: ignore
                review_id=created.id,
                vote=self.review_service.VoteRequest(value=-1),  # type: ignore
                db=self.db,
                current_user=voter,
            )
        )
        self.assertEqual(out.upvotes, 0)
        self.assertEqual(out.downvotes, 1)

        out = asyncio.run(
            self.review_service.vote_on_review(  # type: ignore
                review_id=created.id,
                vote=self.review_service.VoteRequest(value=-1),  # type: ignore
                db=self.db,
                current_user=voter,
            )
        )
        self.assertEqual(out.upvotes, 0)
        self.assertEqual(out.downvotes, 0)

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(
                self.review_service.vote_on_review(  # type: ignore
                    review_id=999,
                    vote=self.review_service.VoteRequest(value=1),  # type: ignore
                    db=self.db,
                    current_user=voter,
                )
            )
        self.assertEqual(ctx.exception.status_code, 404)

