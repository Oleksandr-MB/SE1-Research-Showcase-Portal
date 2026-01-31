import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi import BackgroundTasks, HTTPException
from passlib.context import CryptContext

from src.database import models

from tst.test_support import import_backend_app_with_stubbed_db, make_sqlite_session_factory


class _DummySMTP:
    def __init__(self, *_args, **_kwargs):
        self.starttls_called = False
        self.login_called = False
        self.send_message_called = False
        self.raise_on_send = False

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    def starttls(self):
        self.starttls_called = True

    def login(self, *_args, **_kwargs):
        self.login_called = True

    def send_message(self, *_args, **_kwargs):
        self.send_message_called = True
        if self.raise_on_send:
            raise RuntimeError("boom")


class TestUserServiceCoverage(unittest.TestCase):
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

    def _register_user(self, username: str, *, verified: bool = True) -> models.User:
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
        if verified:
            self._mark_email_verified(username)
        return self.db.query(models.User).filter(models.User.username == username).one()

    def test_extract_argon_salt_invalid_raises(self):
        with self.assertRaises(RuntimeError):
            self.user_service._extract_argon_salt("not-an-argon2-hash")  # type: ignore

    def test_smtp_enabled_false_and_true(self):
        with patch.multiple(
            self.user_service,  # type: ignore
            EMAIL_SENDER=None,
            EMAIL_PASSWORD=None,
            EMAIL_SMTP_SERVER=None,
            EMAIL_SMTP_PORT=0,
        ):
            self.assertFalse(self.user_service._smtp_enabled())  # type: ignore

        with patch.multiple(
            self.user_service,  # type: ignore
            EMAIL_SENDER="sender@example.com",
            EMAIL_PASSWORD="pw",
            EMAIL_SMTP_SERVER="smtp.example.com",
            EMAIL_SMTP_PORT=587,
        ):
            self.assertTrue(self.user_service._smtp_enabled())  # type: ignore

    def test_send_verification_email_skip_when_unconfigured(self):
        smtp = Mock(side_effect=AssertionError("SMTP should not be called"))
        with patch.multiple(
            self.user_service,  # type: ignore
            EMAIL_SENDER=None,
            EMAIL_PASSWORD=None,
            EMAIL_SMTP_SERVER=None,
            EMAIL_SMTP_PORT=0,
        ), patch("src.backend.services.user_service.smtplib.SMTP", new=smtp):
            self.user_service.send_verification_email(  # type: ignore
                "alice@example.com",
                "http://example.com/verify",
            )

    def test_send_verification_email_sends_and_handles_error(self):
        dummy = _DummySMTP()

        def smtp_factory(*_args, **_kwargs):
            return dummy

        with patch.multiple(
            self.user_service,  # type: ignore
            EMAIL_SENDER="sender@example.com",
            EMAIL_PASSWORD="pw",
            EMAIL_SMTP_SERVER="smtp.example.com",
            EMAIL_SMTP_PORT=587,
        ), patch("src.backend.services.user_service.smtplib.SMTP", new=smtp_factory):
            self.user_service.send_verification_email(  # type: ignore
                "alice@example.com",
                "http://example.com/verify",
            )
            self.assertTrue(dummy.starttls_called)
            self.assertTrue(dummy.login_called)
            self.assertTrue(dummy.send_message_called)

            dummy.raise_on_send = True
            self.user_service.send_verification_email(  # type: ignore
                "alice@example.com",
                "http://example.com/verify",
            )

    def test_send_password_reset_email_sends(self):
        dummy = _DummySMTP()

        def smtp_factory(*_args, **_kwargs):
            return dummy

        with patch.multiple(
            self.user_service,  # type: ignore
            EMAIL_SENDER="sender@example.com",
            EMAIL_PASSWORD="pw",
            EMAIL_SMTP_SERVER="smtp.example.com",
            EMAIL_SMTP_PORT=587,
        ), patch("src.backend.services.user_service.smtplib.SMTP", new=smtp_factory):
            self.user_service.send_password_reset_email(  # type: ignore
                "alice@example.com",
                "http://example.com/reset",
            )
            self.assertTrue(dummy.send_message_called)

    def test_request_password_reset_unknown_email(self):
        out = self.user_service.request_password_reset(  # type: ignore
            payload=self.user_service.PasswordResetRequest(email="missing@example.com"),  # type: ignore
            db=self.db,
        )
        self.assertIn("message", out)

    def test_request_password_reset_catches_send_failures(self):
        self._register_user("alice")

        with patch(
            "src.backend.services.user_service.send_password_reset_email",
            autospec=True,
            side_effect=RuntimeError("smtp down"),
        ):
            out = self.user_service.request_password_reset(  # type: ignore
                payload=self.user_service.PasswordResetRequest(email="alice@example.com"),  # type: ignore
                db=self.db,
            )
        self.assertIn("message", out)

    def test_reset_password_validation_and_success(self):
        self._register_user("alice")

        with self.assertRaises(HTTPException) as ctx:
            self.user_service.reset_password(  # type: ignore
                payload=self.user_service.PasswordResetConfirm(  # type: ignore
                    token="not-a-token",
                    new_password="newpassword",
                ),
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 400)

        wrong_purpose_token = self.user_service.create_token(  # type: ignore
            {"sub": "alice@example.com", "purpose": "not_reset"}
        )
        with self.assertRaises(HTTPException) as ctx:
            self.user_service.reset_password(  # type: ignore
                payload=self.user_service.PasswordResetConfirm(  # type: ignore
                    token=wrong_purpose_token,
                    new_password="newpassword",
                ),
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 400)

        missing_sub_token = self.user_service.create_token(  # type: ignore
            {"purpose": "password_reset"}
        )
        with self.assertRaises(HTTPException) as ctx:
            self.user_service.reset_password(  # type: ignore
                payload=self.user_service.PasswordResetConfirm(  # type: ignore
                    token=missing_sub_token,
                    new_password="newpassword",
                ),
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 400)

        unknown_user_token = self.user_service.create_token(  # type: ignore
            {"sub": "missing@example.com", "purpose": "password_reset"}
        )
        with self.assertRaises(HTTPException) as ctx:
            self.user_service.reset_password(  # type: ignore
                payload=self.user_service.PasswordResetConfirm(  # type: ignore
                    token=unknown_user_token,
                    new_password="newpassword",
                ),
                db=self.db,
            )
        self.assertEqual(ctx.exception.status_code, 404)

        ok_token = self.user_service.create_token(  # type: ignore
            {"sub": "alice@example.com", "purpose": "password_reset"}
        )
        out = self.user_service.reset_password(  # type: ignore
            payload=self.user_service.PasswordResetConfirm(  # type: ignore
                token=ok_token,
                new_password="newpassword",
            ),
            db=self.db,
        )
        self.assertEqual(out["message"], "Password updated successfully")

        db_user = self.db.query(models.User).filter(models.User.username == "alice").one()
        self.assertTrue(
            self.user_service.verify_password("newpassword", db_user.password_hash)  # type: ignore
        )

    def test_verify_email_paths(self):
        self._register_user("alice", verified=False)

        with self.assertRaises(HTTPException) as ctx:
            self.user_service.verify_email(token="not-a-token", db=self.db)  # type: ignore
        self.assertEqual(ctx.exception.status_code, 400)

        no_sub_token = self.user_service.create_token({"foo": "bar"})  # type: ignore
        with self.assertRaises(HTTPException) as ctx:
            self.user_service.verify_email(token=no_sub_token, db=self.db)  # type: ignore
        self.assertEqual(ctx.exception.status_code, 400)

        unknown_email_token = self.user_service.create_token({"sub": "nope@example.com"})  # type: ignore
        with self.assertRaises(HTTPException) as ctx:
            self.user_service.verify_email(token=unknown_email_token, db=self.db)  # type: ignore
        self.assertEqual(ctx.exception.status_code, 404)

        ok_token = self.user_service.create_token({"sub": "alice@example.com"})  # type: ignore
        out1 = self.user_service.verify_email(token=ok_token, db=self.db)  # type: ignore
        self.assertEqual(out1["message"], "Email successfully verified")

        out2 = self.user_service.verify_email(token=ok_token, db=self.db)  # type: ignore
        self.assertEqual(out2["message"], "Email already verified")

    def test_start_cleanup_scheduler_registers_job_and_job_runs(self):
        old_user = self._register_user("old", verified=False)
        old_user.created_at = datetime.now(timezone.utc) - timedelta(days=1)
        self.db.commit()

        captured = {}

        class DummyScheduler:
            def add_job(self, func, **kwargs):
                captured["job"] = func
                captured["kwargs"] = kwargs

            def start(self):
                captured["started"] = True

        job_db = self.SessionLocal()
        try:
            def fake_get_db():
                yield job_db

            job_user = job_db.query(models.User).filter(models.User.username == "old").one()
            job_user.is_email_verified = False
            job_user.created_at = datetime.now(timezone.utc) - timedelta(days=1)
            job_db.commit()

            with patch.object(self.user_service, "scheduler", new=DummyScheduler()):  # type: ignore
                with patch.object(self.user_service, "get_db", new=fake_get_db):  # type: ignore
                    self.user_service.start_cleanup_scheduler()  # type: ignore

            self.assertTrue(captured.get("started", False))
            self.assertEqual(captured["kwargs"]["id"], "delete_expired_users")

            with patch.object(self.user_service, "get_db", new=fake_get_db):  # type: ignore
                captured["job"]()

            remaining = (
                self.db.query(models.User).filter(models.User.username == "old").first()
            )
            self.assertIsNone(remaining)
        finally:
            job_db.close()

    def test_login_error_branches(self):
        self._register_user("alice")

        form_missing = self.user_service.OAuth2PasswordRequestForm(  # type: ignore
            username="missing",
            password="password123",
            scope="",
            client_id=None,
            client_secret=None,
        )
        with self.assertRaises(HTTPException) as ctx:
            self.user_service.login(form_data=form_missing, db=self.db)  # type: ignore
        self.assertEqual(ctx.exception.status_code, 401)

        form_wrong_pw = self.user_service.OAuth2PasswordRequestForm(  # type: ignore
            username="alice",
            password="wrong",
            scope="",
            client_id=None,
            client_secret=None,
        )
        with self.assertRaises(HTTPException) as ctx:
            self.user_service.login(form_data=form_wrong_pw, db=self.db)  # type: ignore
        self.assertEqual(ctx.exception.status_code, 401)

    def test_user_profile_count_latest(self):
        self._register_user("a1")
        self._register_user("a2")
        self._register_user("a3")

        count = asyncio.run(self.user_service.get_user_count(db=self.db))  # type: ignore
        self.assertEqual(count, 3)

        latest = asyncio.run(self.user_service.get_latest_users(db=self.db, n=2))  # type: ignore
        self.assertEqual(len(latest), 2)

        profile = asyncio.run(self.user_service.get_user_profile("a1", db=self.db))  # type: ignore
        self.assertEqual(profile.username, "a1")

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(self.user_service.get_user_profile("missing", db=self.db))  # type: ignore
        self.assertEqual(ctx.exception.status_code, 404)

    def test_user_post_count_and_score(self):
        poster = self._register_user("poster")
        voter = self._register_user("voter")

        post = models.Post(
            poster_id=poster.id,
            title="Post",
            authors_text="Poster",
            abstract="Abstract",
            body="Body",
            phase=models.PostPhase.PUBLISHED,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)

        self.db.add(models.PostVote(user_id=voter.id, post_id=post.id, value=1))
        self.db.commit()

        comment = models.Comment(post_id=post.id, commenter_id=poster.id, body="Hi")
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)

        self.db.add(models.CommentVote(user_id=voter.id, comment_id=comment.id, value=-1))
        self.db.commit()

        post_count = asyncio.run(
            self.user_service.get_user_post_count("poster", db=self.db)  # type: ignore
        )
        self.assertEqual(post_count, 1)

        score = asyncio.run(self.user_service.get_user_score("poster", db=self.db))  # type: ignore
        self.assertEqual(score, 0)

    def test_update_profile_and_recent_comments(self):
        user = self._register_user("alice")

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(
                self.user_service.update_current_user_profile(  # type: ignore
                    payload=self.user_service.ProfileUpdate(),  # type: ignore
                    db=self.db,
                    current_user=user,
                )
            )
        self.assertEqual(ctx.exception.status_code, 400)

        updated = asyncio.run(
            self.user_service.update_current_user_profile(  # type: ignore
                payload=self.user_service.ProfileUpdate(display_name="Alice"),  # type: ignore
                db=self.db,
                current_user=user,
            )
        )
        self.assertEqual(updated.display_name, "Alice")

        post = models.Post(
            poster_id=user.id,
            title="Post title",
            authors_text="Alice",
            abstract="Abstract",
            body="Body",
            phase=models.PostPhase.PUBLISHED,
        )
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)

        comment = models.Comment(post_id=post.id, commenter_id=user.id, body="Hello")
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)

        self.db.add(models.CommentVote(user_id=user.id, comment_id=comment.id, value=1))
        self.db.add(models.CommentVote(user_id=self._register_user("bob").id, comment_id=comment.id, value=-1))
        self.db.commit()

        items = asyncio.run(
            self.user_service.get_my_recent_comments(  # type: ignore
                db=self.db,
                current_user=user,
                n=10,
            )
        )
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].post_title, "Post title")
        self.assertEqual(items[0].upvotes, 1)
        self.assertEqual(items[0].downvotes, 1)
