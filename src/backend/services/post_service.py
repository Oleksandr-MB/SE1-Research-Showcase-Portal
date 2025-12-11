from typing import Annotated
import mimetypes
import logging
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
from urllib.parse import urlparse

from fastapi import Depends, APIRouter, HTTPException, UploadFile, File, Body
from pydantic import ValidationError
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from src.database.db import get_db
from src.database import models
from src.backend.services.schemas import (
    PostCreate,
    PostRead,
    AttachmentUploadResponse,
    CommentThreadRead,
    CommentWrite,
    VoteRequest,
    VoteResponse,
)
from src.backend.services import vote_service
from src.backend.services.user_service import get_current_user
from src.backend.services.paths import ATTACHMENTS_DIR

logging.basicConfig(level=logging.INFO)

router = APIRouter()

ATTACHMENT_PREFIX = "/attachments/"


def _escape(query: str) -> str:
    MAX_LEN = 128
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


def _normalize_attachment_value(raw_value: str | None) -> str | None:
    if not raw_value:
        return None

    candidate = raw_value.strip()
    if not candidate:
        return None

    if candidate.startswith("{") and candidate.endswith("}"):
        target_from_dict: str | None = None
        try:
            parsed_json = json.loads(candidate)
            if isinstance(parsed_json, dict):
                for key in ("file_path", "path"):
                    value = parsed_json.get(key)
                    if isinstance(value, str) and value.strip():
                        target_from_dict = value.strip()
                        break
        except json.JSONDecodeError:
            target_from_dict = None

        if target_from_dict:
            candidate = target_from_dict

    try:
        parsed = urlparse(candidate)
        candidate = parsed.path or candidate
    except ValueError:
        pass

    normalized = candidate.replace("\\", "/")
    if normalized.startswith(ATTACHMENT_PREFIX):
        return normalized

    parts = [segment for segment in normalized.split("/") if segment]
    if not parts:
        return None

    return f"{ATTACHMENT_PREFIX}{parts[-1]}"


def _to_post_read(post: models.Post) -> PostRead:
    upvotes = sum(1 for vote in post.post_votes if vote.value == 1)
    downvotes = sum(1 for vote in post.post_votes if vote.value == -1)
    return PostRead(
        id=post.id,
        abstract=post.abstract,
        authors_text=post.authors_text,
        bibtex=post.bibtex,
        tags=[tag.name for tag in post.tags],
        attachments=[
            normalized
            for attachment in post.attachments
            for normalized in [_normalize_attachment_value(attachment.file_path)]
            if normalized
        ],
        title=post.title,
        body=post.body,
        poster_id=post.poster_id,
        poster_username=post.poster.username if post.poster else "",
        created_at=post.created_at,
        phase=post.phase,
        upvotes=upvotes,
        downvotes=downvotes,
    )


def _parse_vote_payload(payload: VoteRequest | dict | str) -> VoteRequest:
    if isinstance(payload, VoteRequest):
        return payload

    if isinstance(payload, str):
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
    elif isinstance(payload, dict):
        data = payload
    else:
        raise HTTPException(status_code=422, detail="Invalid vote payload")

    try:
        return VoteRequest(**data)
    except ValidationError:
        raise HTTPException(status_code=422, detail="Invalid vote payload")


@router.post("/attachments/upload", response_model=AttachmentUploadResponse)
async def upload_post_attachment(
    current_user: Annotated[models.User, Depends(get_current_user)],
    file: UploadFile = File(...),
) -> AttachmentUploadResponse:
    if not file or not file.filename:
        raise HTTPException(
            status_code=400,
            detail="A valid file with a filename must be provided.",
        )

    mime_type = file.content_type or "application/octet-stream"
    extension = Path(file.filename).suffix
    destination_name = f"{uuid.uuid4().hex}{extension}"
    ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)
    destination_path = ATTACHMENTS_DIR / destination_name

    file_contents = await file.read()
    if not file_contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    with destination_path.open("wb") as buffer:
        buffer.write(file_contents)

    logging.info(
        "User %s uploaded attachment %s saved as %s",
        current_user.id,
        file.filename,
        destination_name,
    )

    return AttachmentUploadResponse(
        file_path=f"/attachments/{destination_name}",
        mime_type=mime_type,
        original_filename=file.filename,
    )


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
                        models.Post.body.ilike(pattern, escape="\\"),
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
                or (query_lower in (post.body or "").lower())
                or (query_lower in (post.abstract or "").lower())
                or (query_lower in (post.authors_text or "").lower())
                or any(
                    query_lower in (tag.name or "").lower()
                    for tag in post.tags
                )
            ]

    return [_to_post_read(post) for post in db_posts]


@router.post("/create")
async def create_research_post(
    raw_body: Annotated[str, Body(...)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> PostRead:
    if not raw_body:
        logging.error("Empty body received for post creation")
        raise HTTPException(
            status_code=400, detail="Request body cannot be empty")

    try:
        raw_payload = json.loads(raw_body)
    except json.JSONDecodeError:
        logging.error("Request body is not valid JSON for post creation")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    payload = raw_payload
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            logging.error("JSON string payload for post creation is malformed")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if isinstance(payload, str):
        try:
            post = PostCreate.model_validate_json(payload)
        except ValidationError:
            logging.error("Invalid post payload provided as JSON string")
            raise HTTPException(status_code=422, detail="Invalid post payload")
    elif isinstance(payload, dict):
        try:
            post = PostCreate(**payload)
        except ValidationError:
            logging.error("Invalid post payload provided as dict")
            raise HTTPException(status_code=422, detail="Invalid post payload")
    else:
        logging.error(
            "Unsupported payload type %s for post creation", type(payload))
        raise HTTPException(status_code=422, detail="Invalid post payload")
    requested_phase = post.phase or models.PostPhase.DRAFT
    if requested_phase == models.PostPhase.DRAFT:
        existing_draft = (
            db.query(models.Post)
            .filter(
                models.Post.poster_id == current_user.id,
                models.Post.phase == models.PostPhase.DRAFT,
            )
            .first()
        )
        if existing_draft:
            logging.error(
                "User %s attempted to create a second draft post", current_user.id
            )
            raise HTTPException(
                status_code=400,
                detail="You already have an active draft post. Publish or delete it before creating a new draft.",
            )

    db_post = models.Post(
        title=post.title,
        body=post.body,
        abstract=post.abstract,
        authors_text=post.authors_text,
        bibtex=post.bibtex,
        poster_id=current_user.id,
        created_at=datetime.now(timezone.utc),
        phase=requested_phase,
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
        for attachment_path in post.attachments:
            normalized = (
                _normalize_attachment_value(attachment_path)
                if isinstance(attachment_path, str)
                else None
            )
            if not normalized:
                logging.warning(
                    "Attachment skipped because file_path is invalid: %s",
                    attachment_path,
                )
                continue

            guessed_mime_type, _ = mimetypes.guess_type(normalized)
            mime_type = guessed_mime_type or "application/octet-stream"

            attachment = models.Attachment(
                file_path=normalized,
                mime_type=mime_type,
                post_id=db_post.id,
            )
            db.add(attachment)

    db.commit()

    return _to_post_read(db_post)


@router.get("/by/{username}", response_model=list[PostRead])
def get_posts_by_username(
    username: str,
    db: Annotated[Session, Depends(get_db)],
) -> list[PostRead]:
    user = (
        db.query(models.User)
        .filter(models.User.username == username)
        .first()
    )
    if not user:
        logging.error("User %s not found when listing posts", username)
        raise HTTPException(status_code=404, detail="User not found")

    posts = (
        db.query(models.Post)
        .filter(
            models.Post.poster_id == user.id,
            models.Post.phase == models.PostPhase.PUBLISHED,
        )
        .order_by(models.Post.created_at.desc())
        .all()
    )
    return [_to_post_read(post) for post in posts]


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
    return _to_post_read(db_post)


@router.get("/{post_id}/comments", response_model=list[CommentThreadRead])
def get_post_comments(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[CommentThreadRead]:
    post_exists = (
        db.query(models.Post.id)
        .filter(models.Post.id == post_id)
        .first()
    )
    if not post_exists:
        logging.error(
            "Post with ID %s not found when listing comments", post_id)
        raise HTTPException(status_code=404, detail="Post not found")

    db_comments = (
        db.query(models.Comment)
        .options(joinedload(models.Comment.commenter))
        .options(joinedload(models.Comment.comment_votes))
        .filter(models.Comment.post_id == post_id)
        .order_by(models.Comment.created_at.asc())
        .all()
    )

    return [
        CommentThreadRead(
            id=comment.id,
            post_id=comment.post_id,
            commenter_id=comment.commenter_id,
            commenter_username=comment.commenter.username if comment.commenter else "Unknown",
            parent_comment_id=comment.parent_comment_id,
            body=comment.body,
            created_at=comment.created_at,
            upvotes=sum(
                1 for vote in comment.comment_votes if vote.value == 1),
            downvotes=sum(
                1 for vote in comment.comment_votes if vote.value == -1),
        )
        for comment in db_comments
    ]


@router.post("/{post_id}/comments", response_model=CommentThreadRead, status_code=201)
def create_post_comment(
    post_id: int,
    payload: CommentWrite | dict | str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> CommentThreadRead:
    if isinstance(payload, str):
        try:
            payload_dict = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
    elif isinstance(payload, CommentWrite):
        payload_dict = payload.dict()
    elif isinstance(payload, dict):
        payload_dict = payload
    else:
        raise HTTPException(status_code=422, detail="Invalid comment payload")

    try:
        parsed_payload = CommentWrite(**payload_dict)
    except ValidationError:
        raise HTTPException(status_code=422, detail="Invalid comment payload")
    post_exists = (
        db.query(models.Post.id)
        .filter(models.Post.id == post_id)
        .first()
    )
    if not post_exists:
        logging.error(
            "Post with ID %s not found when creating comment", post_id)
        raise HTTPException(status_code=404, detail="Post not found")

    parent_comment_id = parsed_payload.parent_comment_id
    if parent_comment_id is not None:
        parent_comment = (
            db.query(models.Comment)
            .filter(
                models.Comment.id == parent_comment_id,
                models.Comment.post_id == post_id,
            )
            .first()
        )
        if not parent_comment:
            logging.error(
                "Parent comment %s not found for post %s",
                parent_comment_id,
                post_id,
            )
            raise HTTPException(
                status_code=404, detail="Parent comment not found")

    body = (parsed_payload.body or "").strip()
    if not body:
        raise HTTPException(
            status_code=400, detail="Comment body cannot be empty")

    db_comment = models.Comment(
        post_id=post_id,
        commenter_id=current_user.id,
        parent_comment_id=parent_comment_id,
        body=body,
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)

    return CommentThreadRead(
        id=db_comment.id,
        post_id=db_comment.post_id,
        commenter_id=db_comment.commenter_id,
        commenter_username=current_user.username,
        parent_comment_id=db_comment.parent_comment_id,
        body=db_comment.body,
        created_at=db_comment.created_at,
        upvotes=0,
        downvotes=0,
    )


@router.post("/{post_id}/vote", response_model=VoteResponse)
def vote_on_post(
    post_id: int,
    vote: VoteRequest | dict | str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> VoteResponse:
    vote_model = _parse_vote_payload(vote)
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")

    if vote_model.value == 0:
        vote_service.remove_post_vote(db, current_user.id, post_id)
    else:
        vote_service.vote_post(db, current_user.id, post_id, vote_model.value)

    counts = vote_service.get_post_votes(db, post_id)
    return VoteResponse(**counts)


@router.post("/{post_id}/comments/{comment_id}/vote", response_model=VoteResponse)
def vote_on_comment(
    post_id: int,
    comment_id: int,
    vote: VoteRequest | dict | str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> VoteResponse:
    vote_model = _parse_vote_payload(vote)
    db_comment = (
        db.query(models.Comment)
        .filter(models.Comment.id == comment_id, models.Comment.post_id == post_id)
        .first()
    )
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if vote_model.value == 0:
        vote_service.remove_comment_vote(db, current_user.id, comment_id)
    else:
        vote_service.vote_comment(
            db, current_user.id, comment_id, vote_model.value)

    counts = vote_service.get_comment_votes(db, comment_id)
    return VoteResponse(**counts)


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


@router.get("/my", response_model=list[PostRead])
def get_my_research_posts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[models.User, Depends(get_current_user)],
) -> list[PostRead]:
    db_posts = db.query(models.Post).filter(
        models.Post.poster_id == current_user.id).all()

    logging.info(
        f"Retrieved {len(db_posts)} posts for user ID {current_user.id}")

    if not db_posts:
        logging.info(f"No posts found for user ID {current_user.id}")
        return []

    return sorted([_to_post_read(post) for post in db_posts],
                  key=lambda x: x.created_at, reverse=True)
