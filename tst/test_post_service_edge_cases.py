import asyncio
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi import BackgroundTasks, HTTPException
from passlib.context import CryptContext

from src.database import models

from tst.test_support import import_backend_app_with_stubbed_db, make_sqlite_session_factory


class TestPostServiceEdgeCases(unittest.TestCase):
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
        self.user_service._revoked_tokens.clear()  # type: ignore

    def tearDown(self):
        self.db.close()
        self._pwd_context_patcher.stop()

    def _mark_email_verified(self, username: str) -> None:
        user = self.db.query(models.User).filter(models.User.username == username).one()
        user.is_email_verified = True
        self.db.commit()

    def _create_verified_user(self, username: str) -> models.User:
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

    def _create_post(self, current_user: models.User, payload: object):
        return asyncio.run(
            self.post_service.create_research_post(  # type: ignore
                raw_body=json.dumps(payload),
                db=self.db,
                current_user=current_user,
            )
        )

    def test_escape_and_attachment_normalization_helpers(self):
        self.assertEqual(self.post_service._escape(None), "")  # type: ignore
        escaped = self.post_service._escape(r" 100%_ \ ")  # type: ignore
        self.assertIn("\\%", escaped)
        self.assertIn("\\_", escaped)
        self.assertIn("\\\\", escaped)

        self.assertEqual(self.post_service._normalize_attachment_value("   "), None)  # type: ignore
        self.assertEqual(  # type: ignore
            self.post_service._normalize_attachment_value('{"file_path": "attachments/x.pdf"}'),
            "/attachments/x.pdf",
        )
        self.assertEqual(  # type: ignore
            self.post_service._normalize_attachment_value("{bad}"),
            "/attachments/{bad}",
        )

    def test_parse_vote_payload_validation(self):
        with self.assertRaises(HTTPException) as ctx:
            self.post_service._parse_vote_payload("not-json")  # type: ignore
        self.assertEqual(ctx.exception.status_code, 400)

        with self.assertRaises(HTTPException) as ctx:
            self.post_service._parse_vote_payload(["nope"])  # type: ignore
        self.assertEqual(ctx.exception.status_code, 422)

        with self.assertRaises(HTTPException) as ctx:
            self.post_service._parse_vote_payload({"no_value": 1})  # type: ignore
        self.assertEqual(ctx.exception.status_code, 422)

    def test_upload_attachment_validates_empty_and_writes_file(self):
        class DummyUploadFile:
            def __init__(self, *, filename: str, content: bytes, content_type: str | None = None):
                self.filename = filename
                self.content_type = content_type
                self._content = content

            async def read(self) -> bytes:
                return self._content

        user = self._create_verified_user("alice")
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(self.post_service, "ATTACHMENTS_DIR", new=Path(tmp)):  # type: ignore
                empty_file = DummyUploadFile(filename="empty.txt", content=b"")
                with self.assertRaises(HTTPException) as ctx:
                    asyncio.run(
                        self.post_service.upload_post_attachment(  # type: ignore
                            current_user=user,
                            file=empty_file,
                        )
                    )
                self.assertEqual(ctx.exception.status_code, 400)

                ok_file = DummyUploadFile(filename="ok.txt", content=b"hello", content_type="text/plain")
                resp = asyncio.run(
                    self.post_service.upload_post_attachment(  # type: ignore
                        current_user=user,
                        file=ok_file,
                    )
                )
                self.assertTrue(resp.file_path.startswith("/attachments/"))
                self.assertTrue((Path(tmp) / Path(resp.file_path).name).exists())

    def test_create_post_payload_validation_errors(self):
        user = self._create_verified_user("alice")

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(
                self.post_service.create_research_post(  # type: ignore
                    raw_body="",
                    db=self.db,
                    current_user=user,
                )
            )
        self.assertEqual(ctx.exception.status_code, 400)

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(
                self.post_service.create_research_post(  # type: ignore
                    raw_body="{bad",
                    db=self.db,
                    current_user=user,
                )
            )
        self.assertEqual(ctx.exception.status_code, 400)

        with self.assertRaises(HTTPException) as ctx:
            self._create_post(user, {})
        self.assertEqual(ctx.exception.status_code, 422)

        nested_bad = '{"title": "x"'  # JSON string, but malformed object
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(
                self.post_service.create_research_post(  # type: ignore
                    raw_body=json.dumps(nested_bad),
                    db=self.db,
                    current_user=user,
                )
            )
        self.assertEqual(ctx.exception.status_code, 400)

        with self.assertRaises(HTTPException) as ctx:
            self._create_post(user, 123)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_find_posts_empty_query_and_escaping(self):
        user = self._create_verified_user("alice")
        self._create_post(
            user,
            {
                "title": "Title 100%_",
                "authors_text": "Alice",
                "abstract": "Abstract",
                "body": r"Body \ stuff",
                "tags": ["tag_1"],
            },
        )

        all_posts = self.post_service.find_research_posts(db=self.db, query=None)  # type: ignore
        self.assertEqual(len(all_posts), 1)

        whitespace_posts = self.post_service.find_research_posts(db=self.db, query="   ")  # type: ignore
        self.assertEqual(len(whitespace_posts), 1)

        by_title = self.post_service.find_research_posts(db=self.db, query="100%_")  # type: ignore
        self.assertEqual(len(by_title), 1)

    def test_get_post_and_comments_not_found(self):
        with self.assertRaises(HTTPException) as ctx:
            self.post_service.get_research_post(post_id=999, db=self.db)  # type: ignore
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.get_post_comments(post_id=999, db=self.db)  # type: ignore
        self.assertEqual(ctx.exception.status_code, 404)

    def test_create_comment_validation_errors(self):
        user = self._create_verified_user("alice")

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.create_post_comment(  # type: ignore
                post_id=1,
                payload="not-json",
                db=self.db,
                current_user=user,
            )
        self.assertEqual(ctx.exception.status_code, 400)

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.create_post_comment(  # type: ignore
                post_id=1,
                payload=1,
                db=self.db,
                current_user=user,
            )
        self.assertEqual(ctx.exception.status_code, 422)

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.create_post_comment(  # type: ignore
                post_id=1,
                payload={"no_body": True},
                db=self.db,
                current_user=user,
            )
        self.assertEqual(ctx.exception.status_code, 422)

        post = self._create_post(
            user,
            {
                "title": "Post",
                "authors_text": "Alice",
                "abstract": "Abstract",
                "body": "Body",
            },
        )

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.create_post_comment(  # type: ignore
                post_id=post.id,
                payload={"parent_comment_id": 123, "body": "Reply"},
                db=self.db,
                current_user=user,
            )
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.create_post_comment(  # type: ignore
                post_id=post.id,
                payload={"body": "   "},
                db=self.db,
                current_user=user,
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_get_my_posts_returns_empty_and_sorted(self):
        user = self._create_verified_user("alice")
        empty = self.post_service.get_my_research_posts(db=self.db, current_user=user)  # type: ignore
        self.assertEqual(empty, [])

        p1 = models.Post(
            poster_id=user.id,
            title="Old",
            authors_text="Alice",
            abstract="A",
            body="B",
            created_at=datetime(2000, 1, 1, tzinfo=timezone.utc),
            phase=models.PostPhase.PUBLISHED,
        )
        p2 = models.Post(
            poster_id=user.id,
            title="New",
            authors_text="Alice",
            abstract="A",
            body="B",
            created_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
            phase=models.PostPhase.PUBLISHED,
        )
        self.db.add_all([p1, p2])
        self.db.commit()

        mine = self.post_service.get_my_research_posts(db=self.db, current_user=user)  # type: ignore
        self.assertEqual([p.title for p in mine], ["New", "Old"])

    def test_delete_post_and_comment_closes_related_reports(self):
        poster = self._create_verified_user("poster")
        reporter = self._create_verified_user("reporter")
        moderator = self._create_verified_user("mod")
        moderator.role = models.UserRole.MODERATOR
        self.db.commit()
        self.db.refresh(moderator)

        post = self._create_post(
            poster,
            {
                "title": "Post",
                "authors_text": "Poster",
                "abstract": "Abstract",
                "body": "Body",
            },
        )

        report = self.post_service.create_report_for_post(  # type: ignore
            post_id=post.id,
            payload=self.post_service.ReportCreate(description="Spam"),  # type: ignore
            db=self.db,
            current_user=reporter,
        )

        self.post_service.delete_research_post(post_id=post.id, db=self.db, current_user=moderator)  # type: ignore
        closed = self.db.query(models.Report).filter(models.Report.id == report.id).one()
        self.assertEqual(closed.status, models.ReportStatus.CLOSED)

        post2 = self._create_post(
            poster,
            {
                "title": "Post 2",
                "authors_text": "Poster",
                "abstract": "Abstract",
                "body": "Body",
            },
        )
        comment = self.post_service.create_post_comment(  # type: ignore
            post_id=post2.id,
            payload={"body": "Comment"},
            db=self.db,
            current_user=poster,
        )
        comment_report = self.post_service.create_report_for_comment(  # type: ignore
            post_id=post2.id,
            comment_id=comment.id,
            payload=self.post_service.ReportCreate(description="Abuse"),  # type: ignore
            db=self.db,
            current_user=reporter,
        )

        self.post_service.delete_comment(  # type: ignore
            post_id=post2.id,
            comment_id=comment.id,
            db=self.db,
            current_user=moderator,
        )
        closed_comment_report = (
            self.db.query(models.Report).filter(models.Report.id == comment_report.id).one()
        )
        self.assertEqual(closed_comment_report.status, models.ReportStatus.CLOSED)

    def test_report_comment_errors(self):
        user = self._create_verified_user("alice")

        with self.assertRaises(HTTPException) as ctx:
            self.post_service.create_report_for_comment(  # type: ignore
                post_id=1,
                comment_id=1,
                payload=self.post_service.ReportCreate(description="x"),  # type: ignore
                db=self.db,
                current_user=user,
            )
        self.assertEqual(ctx.exception.status_code, 404)

        post = self._create_post(
            user,
            {"title": "Post", "authors_text": "A", "abstract": "A", "body": "B"},
        )
        comment = self.post_service.create_post_comment(  # type: ignore
            post_id=post.id,
            payload={"body": "Comment"},
            db=self.db,
            current_user=user,
        )
        with self.assertRaises(HTTPException) as ctx:
            self.post_service.create_report_for_comment(  # type: ignore
                post_id=post.id,
                comment_id=comment.id,
                payload=self.post_service.ReportCreate(description="x"),  # type: ignore
                db=self.db,
                current_user=user,
            )
        self.assertEqual(ctx.exception.status_code, 400)
