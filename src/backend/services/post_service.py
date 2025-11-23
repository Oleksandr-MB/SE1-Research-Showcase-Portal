from typing import Annotated
import mimetypes
import logging
from datetime import datetime, timedelta, timezone

from fastapi import Depends, APIRouter, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from src.backend.db.db import get_db
from src.backend.db import models
from src.backend.services.schemas import PostCreate, PostRead
from src.backend.services.user_service import get_current_user

logging.basicConfig(level=logging.INFO)

router = APIRouter()


def _escape(query: str) -> str:
    MAX_LEN = 200
    if query is None:
        return ""

    q = query.strip()
    q = q[:MAX_LEN]

    q = (
        q.replace("\\", "\\\\")
         .replace("%", "\\%")
         .replace("_", "\\_")
    )
    return q


@router.get("/", response_model=list[PostRead])
def find_research_posts(
    db: Annotated[Session, Depends(get_db)],
    query: str | None = None,
) -> list[PostRead]:
    if not query:
        db_posts = db.query(models.Post).all()
    else:
        raw_query = query.strip()
        if not raw_query:
            db_posts = db.query(models.Post).all()
        else:
            query_lower = raw_query.lower()

            escaped = _escape(raw_query)
            pattern = f"%{escaped}%"

            posts_by_text = (
                db.query(models.Post)
                .filter(
                    or_(
                        models.Post.title.ilike(pattern, escape="\\"),
                        models.Post.content.ilike(pattern, escape="\\"),
                        models.Post.abstract.ilike(pattern, escape="\\"),
                        models.Post.authors_text.ilike(pattern, escape="\\"),
                    )
                )
                .all()
            )

            posts_by_tags = (
                db.query(models.Post)
                .join(models.Post.tags)
                .filter(models.Tag.name.ilike(pattern, escape="\\"))
                .all()
            )

            combined = {
                post.id: post for post in posts_by_text + posts_by_tags}
            db_posts = list(combined.values())

            db_posts = [
                post for post in db_posts
                if (query_lower in (post.title or "").lower())
                or (query_lower in (post.content or "").lower())
                or (query_lower in (post.abstract or "").lower())
                or (query_lower in (post.authors_text or "").lower())
                or any(
                    query_lower in (tag.name or "").lower()
                    for tag in post.tags
                )
            ]

    return [
        PostRead(
            id=post.id,
            abstract=post.abstract,
            authors_text=post.authors_text,
            bibtex=post.bibtex,
            tags=[tag.name for tag in post.tags],
            attachments=[
                attachment.file_path for attachment in post.attachments],
            title=post.title,
            content=post.content,
            poster_id=post.poster_id,
        )
        for post in db_posts
    ]


@router.post("/create")
def create_research_post(
    post: PostCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> PostRead:

    db_post = models.Post(
        title=post.title,
        content=post.content,
        abstract=post.abstract,
        authors_text=post.authors_text,
        bibtex=post.bibtex,
        poster_id=current_user.id,
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)

    logging.info(f"Post created with ID: {db_post.id}")

    if post.tags:
        for tag_name in post.tags:
            tag = db.query(models.Tag).filter(
                models.Tag.name == tag_name).first()
            if not tag:
                tag = models.Tag(name=tag_name)
                db.add(tag)
                db.commit()
                db.refresh(tag)
            db_post.tags.append(tag)

    if post.attachments:
        for attachment_data in post.attachments:
            if isinstance(attachment_data, str):
                file_path = attachment_data
                mime_type, _ = mimetypes.guess_type(file_path)
            elif isinstance(attachment_data, dict):
                file_path = attachment_data.get("file_path")
                mime_type = attachment_data.get("mime_type")
            else:
                logging.warning(
                    "Unsupported attachment format: %s", attachment_data)
                continue

            if not file_path:
                logging.warning(
                    "Attachment skipped because file_path is empty: %s", attachment_data)
                continue

            if not mime_type:
                guessed_mime_type, _ = mimetypes.guess_type(file_path)
                mime_type = guessed_mime_type or "application/octet-stream"

            attachment = models.Attachment(
                file_path=file_path,
                mime_type=mime_type,
                post_id=db_post.id
            )
            db.add(attachment)

    db.commit()

    return PostRead(
        id=db_post.id,
        abstract=db_post.abstract,
        authors_text=db_post.authors_text,
        bibtex=db_post.bibtex,
        tags=[tag.name for tag in db_post.tags],
        attachments=[
            attachment.file_path for attachment in db_post.attachments],
        title=db_post.title,
        content=db_post.content,
        poster_id=db_post.poster_id,
    )


@router.get("/top", response_model=list[PostRead])
def list_top_research_posts(
    db: Annotated[Session, Depends(get_db)],
    n: int = 10,
    limit_days: int = 7,
) -> list[PostRead]:

    time_threshold = datetime.now(timezone.utc) - timedelta(days=limit_days)
    db_posts = (
        db.query(models.Post)
        .outerjoin(models.PostVote)
        .filter(models.Post.created_at >= time_threshold)
        .group_by(models.Post.id)
        .order_by(func.count(models.PostVote.id).desc())
        .limit(n)
        .all()
    )

    if not db_posts:
        logging.info("No top posts found in the given time frame")
        return []

    return [
        PostRead(
            id=post.id,
            abstract=post.abstract,
            authors_text=post.authors_text,
            bibtex=post.bibtex,
            tags=[tag.name for tag in post.tags],
            attachments=[
                attachment.file_path for attachment in post.attachments],
            title=post.title,
            content=post.content,
            poster_id=post.poster_id,
        )
        for post in db_posts
    ]


@router.get("/{post_id}", response_model=PostRead)
def get_research_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> PostRead:
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        logging.error(f"Post with ID {post_id} not found")
        raise HTTPException(status_code=404, detail="Post not found")

    logging.info(f"Post with ID {post_id} retrieved successfully")
    return PostRead(
        id=db_post.id,
        abstract=db_post.abstract,
        authors_text=db_post.authors_text,
        bibtex=db_post.bibtex,
        tags=[tag.name for tag in db_post.tags],
        attachments=[
            attachment.file_path for attachment in db_post.attachments],
        title=db_post.title,
        content=db_post.content,
        poster_id=db_post.poster_id,
    )


@router.delete("/{post_id}", status_code=204)
def delete_research_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[models.User, Depends(get_current_user)],
):
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        logging.error(f"Post with ID {post_id} not found for deletion")
        raise HTTPException(status_code=404, detail="Post not found")

    if db_post.poster_id != current_user.id and current_user.role != models.UserRole.MODERATOR:
        logging.error(
            f"User {current_user.id} not authorized to delete post with ID {post_id}")
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this post")

    db.delete(db_post)
    db.commit()
    logging.info(f"Post with ID {post_id} deleted successfully")
