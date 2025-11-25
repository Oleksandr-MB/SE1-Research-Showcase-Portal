from sqlalchemy.orm import Session
import logging
from src.database import models
from src.database.models import Comment, User
from src.backend.services.schemas import CommentCreate, CommentRead
from fastapi import HTTPException, APIRouter

router = APIRouter()


def comment_on_post(db: Session, post_id: int, content: str, user: User) -> CommentRead:
    new_comment = models.Comment(
        content=content,
        post_id=post_id,
        author_id=user.id,
        parent_comment_id=None
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    logging.info(f"✅ Comment added to post ID {post_id} by user ID {user.id}.")

    return CommentRead(
        id=new_comment.id,
        body=new_comment.body,
        post_id=new_comment.post_id,
        commenter_id=new_comment.commenter_id,
        parent_comment_id=new_comment.parent_comment_id,
        created_at=new_comment.created_at,
    )


def reply(db: Session, comment_id: int, reply_in: CommentCreate, user: User) -> CommentRead:
    parent_comment = db.get(Comment, comment_id)
    if not parent_comment:
        logging.error(f"❌ Parent comment with ID {comment_id} not found.")
        raise HTTPException(status_code=404, detail="Parent comment not found")

    new_reply = Comment(
        body=reply_in.body,
        post_id=parent_comment.post_id,
        commenter_id=user.id,
        parent_comment_id=parent_comment.id,
    )
    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)

    logging.info(
        f"✅ Reply added to comment ID {comment_id} by user ID {user.id}.")

    return CommentRead(
        id=new_reply.id,
        body=new_reply.body,
        post_id=new_reply.post_id,
        commenter_id=new_reply.commenter_id,
        parent_comment_id=new_reply.parent_comment_id,
        created_at=new_reply.created_at,
    )


def get_comments_for_post(db: Session, post_id: int) -> list[CommentRead]:
    db_comments = db.query(models.Comment).filter(
        models.Comment.post_id == post_id).all()

    logging.info(
        f"✅ Retrieved {len(db_comments)} comments for post ID {post_id}.")

    return [
        CommentRead(
            id=comment.id,
            body=comment.body,
            post_id=comment.post_id,
            commenter_id=comment.commenter_id,
            parent_comment_id=comment.parent_comment_id,
            created_at=comment.created_at,
        )
        for comment in db_comments
    ]


def delete_comment(db: Session, comment_id: int, user: User) -> None:
    db_comment = db.get(models.Comment, comment_id)
    if not db_comment:
        logging.error(
            f"❌ Comment with ID {comment_id} not found for deletion.")
        raise HTTPException(status_code=404, detail="Comment not found")

    if db_comment.commenter_id != user.id and user.role != models.UserRole.MODERATOR:
        logging.error(
            f"❌ User ID {user.id} not authorized to delete comment ID {comment_id}.")
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this comment")

    db.delete(db_comment)
    db.commit()

    logging.info(
        f"✅ Comment with ID {comment_id} deleted by user ID {user.id}.")
