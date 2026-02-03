import asyncio
import json
import unittest
from unittest.mock import patch

from fastapi import BackgroundTasks, HTTPException
from passlib.context import CryptContext

from src.database import models

from tst.test_support import import_backend_app_with_stubbed_db, make_sqlite_session_factory


class TestPostsApiFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        imported = import_backend_app_with_stubbed_db()
        cls.user_service = imported.user_service
        cls.post_service = imported.post_service

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
        self.user_service._revoked_tokens.clear() # type: ignore

    def tearDown(self):
        self.db.close()
        self._pwd_context_patcher.stop()

    def _mark_email_verified(self, username: str) -> None:
        user = self.db.query(models.User).filter(models.User.username == username).one()
        user.is_email_verified = True
        self.db.commit()

    def _create_verified_user_and_get_current_user(self, username: str):
        with patch(
            "src.backend.services.user_service.send_verification_email",
            autospec=True,
            side_effect=lambda *_args, **_kwargs: None,
        ):
            self.user_service.register_user( # type: ignore
                user_in=self.user_service.UserCreate( # type: ignore
                    username=username,
                    password="password123",
                    email=f"{username}@example.com",
                ),
                background_tasks=BackgroundTasks(),
                db=self.db,
            )

        self._mark_email_verified(username)

        form = self.user_service.OAuth2PasswordRequestForm( # type: ignore
            username=username,
            password="password123",
            scope="",
            client_id=None,
            client_secret=None,
        )
        token = self.user_service.login(form_data=form, db=self.db).access_token # type: ignore
        current_user = asyncio.run(
            self.user_service.get_current_user(token=token, db=self.db) # type: ignore
        )
        return token, current_user

    def _create_post(self, current_user: models.User, payload: dict):
        raw_body = json.dumps(payload)
        return asyncio.run(
            self.post_service.create_research_post( # type: ignore
                raw_body=raw_body,
                db=self.db,
                current_user=current_user,
            )
        )

    def test_create_post_with_tags_and_attachments(self):
        _token, current_user = self._create_verified_user_and_get_current_user("alice")

        created = self._create_post(
            current_user=current_user,
            payload={
                "title": "Test Post",
                "authors_text": "Alice Example",
                "abstract": "Abstract text",
                "body": "Body text",
                "tags": ["ml", "systems"],
                "attachments": [
                    "/attachments/file1.pdf",
                    "attachments/file2.png",
                    r"C:\tmp\file3.txt",
                    "http://example.com/attachments/file4.jpg?x=1",
                    "   ",
                ],
            },
        )

        self.assertEqual(created.title, "Test Post")
        self.assertEqual(set(created.tags), {"ml", "systems"})
        self.assertEqual(
            set(created.attachments or []),
            {
                "/attachments/file1.pdf",
                "/attachments/file2.png",
                "/attachments/file3.txt",
                "/attachments/file4.jpg",
            },
        )

        by_user = self.post_service.get_posts_by_username("alice", db=self.db) # type: ignore
        self.assertEqual(len(by_user), 1)
        self.assertEqual(by_user[0].id, created.id)

    def test_search_posts_by_tag(self):
        _, current_user = self._create_verified_user_and_get_current_user("alice")
        self._create_post(
            current_user=current_user,
            payload={
                "title": "A post about ML",
                "authors_text": "Alice",
                "abstract": "Abstract",
                "body": "Body",
                "tags": ["ml"],
            },
        )

        results = self.post_service.find_research_posts(db=self.db, query="ml") # type: ignore
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].title, "A post about ML")

    def test_comment_and_vote_flow(self):
        _, poster = self._create_verified_user_and_get_current_user("alice")
        _, commenter = self._create_verified_user_and_get_current_user("bob")

        post = self._create_post(
            current_user=poster,
            payload={
                "title": "Post",
                "authors_text": "Alice",
                "abstract": "Abstract",
                "body": "Body",
            },
        )

        comment = self.post_service.create_post_comment( # type: ignore
            post_id=post.id,
            payload={"body": "Nice work!"},
            db=self.db,
            current_user=commenter,
        )
        self.assertEqual(comment.commenter_username, "bob")

        counts = self.post_service.vote_on_comment( # type: ignore
            post_id=post.id,
            comment_id=comment.id,
            vote={"value": 1},
            db=self.db,
            current_user=poster,
        )
        self.assertEqual(counts.upvotes, 1)
        self.assertEqual(counts.downvotes, 0)

        counts = self.post_service.vote_on_comment( # type: ignore
            post_id=post.id,
            comment_id=comment.id,
            vote={"value": 0},
            db=self.db,
            current_user=poster,
        )
        self.assertEqual(counts.upvotes, 0)
        self.assertEqual(counts.downvotes, 0)

    def test_post_vote_flow(self):
        _token, poster = self._create_verified_user_and_get_current_user("alice")
        _token2, voter = self._create_verified_user_and_get_current_user("bob")

        post = self._create_post(
            current_user=poster,
            payload={
                "title": "Post",
                "authors_text": "Alice",
                "abstract": "Abstract",
                "body": "Body",
            },
        )

        counts = self.post_service.vote_on_post( # type: ignore
            post_id=post.id,
            vote={"value": 1},
            db=self.db,
            current_user=voter,
        )
        self.assertEqual(counts.upvotes, 1)
        self.assertEqual(counts.downvotes, 0)

        counts = self.post_service.vote_on_post( # type: ignore
            post_id=post.id,
            vote={"value": -1},
            db=self.db,
            current_user=voter,
        )
        self.assertEqual(counts.upvotes, 0)
        self.assertEqual(counts.downvotes, 1)

        counts = self.post_service.vote_on_post( # type: ignore
            post_id=post.id,
            vote={"value": 0},
            db=self.db,
            current_user=voter,
        )
        self.assertEqual(counts.upvotes, 0)
        self.assertEqual(counts.downvotes, 0)

    def test_delete_comment_requires_owner_or_moderator(self):
        _, poster = self._create_verified_user_and_get_current_user("alice")
        _, commenter = self._create_verified_user_and_get_current_user("bob")
        _, other_user = self._create_verified_user_and_get_current_user("charlie")

        post = self._create_post(
            current_user=poster,
            payload={
                "title": "Post",
                "authors_text": "Alice",
                "abstract": "Abstract",
                "body": "Body",
            },
        )

        comment = self.post_service.create_post_comment( # type: ignore
            post_id=post.id,
            payload={"body": "Nice work!"},
            db=self.db,
            current_user=commenter,
        )

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.delete_comment( # type: ignore
                post_id=post.id,
                comment_id=comment.id,
                db=self.db,
                current_user=other_user,
            )
        self.assertEqual(ctx.exception.status_code, 403)

        db_mod = self.db.query(models.User).filter(models.User.id == other_user.id).one()
        db_mod.role = models.UserRole.MODERATOR
        self.db.commit()
        self.db.refresh(db_mod)

        self.post_service.delete_comment( # type: ignore
            post_id=post.id,
            comment_id=comment.id,
            db=self.db,
            current_user=db_mod,
        )

        deleted = self.db.query(models.Comment).filter(models.Comment.id == comment.id).first()
        self.assertIsNone(deleted)

    def test_delete_post_requires_owner_or_moderator(self):
        _, poster = self._create_verified_user_and_get_current_user("alice")
        _, other_user = self._create_verified_user_and_get_current_user("bob")

        post = self._create_post(
            current_user=poster,
            payload={
                "title": "Post",
                "authors_text": "Alice",
                "abstract": "Abstract",
                "body": "Body",
            },
        )

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.delete_research_post( # type: ignore
                post_id=post.id,
                db=self.db,
                current_user=other_user,
            )
        self.assertEqual(ctx.exception.status_code, 403)

        db_user = self.db.query(models.User).filter(models.User.id == other_user.id).one()
        db_user.role = models.UserRole.MODERATOR
        self.db.commit()
        self.db.refresh(db_user)

        self.post_service.delete_research_post( # type: ignore
            post_id=post.id,
            db=self.db,
            current_user=db_user,
        )
        deleted = self.db.query(models.Post).filter(models.Post.id == post.id).first()
        self.assertIsNone(deleted)
