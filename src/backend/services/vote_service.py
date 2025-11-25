from sqlalchemy.orm import Session
from src.database.models import PostVote, CommentVote


def vote_post(db: Session, user_id: int, post_id: int, value: int) -> PostVote:
    existing_vote = db.query(PostVote).filter_by(
        user_id=user_id, post_id=post_id).first()

    if existing_vote:
        if existing_vote.value == value:
            return existing_vote
        else:
            existing_vote.value = value
            db.commit()
            db.refresh(existing_vote)
            return existing_vote
    else:
        new_vote = PostVote(user_id=user_id, post_id=post_id, value=value)
        db.add(new_vote)
        db.commit()
        db.refresh(new_vote)
        return new_vote


def vote_comment(db: Session, user_id: int, comment_id: int, value: int) -> CommentVote:
    existing_vote = db.query(CommentVote).filter_by(
        user_id=user_id, comment_id=comment_id).first()

    if existing_vote:
        if existing_vote.value == value:
            return existing_vote
        else:
            existing_vote.value = value
            db.commit()
            db.refresh(existing_vote)
            return existing_vote
    else:
        new_vote = CommentVote(
            user_id=user_id, comment_id=comment_id, value=value)
        db.add(new_vote)
        db.commit()
        db.refresh(new_vote)
        return new_vote


def get_post_votes(db: Session, post_id: int) -> dict[str, int]:
    upvotes = db.query(PostVote).filter_by(post_id=post_id, value=1).count()
    downvotes = db.query(PostVote).filter_by(post_id=post_id, value=-1).count()
    return {"upvotes": upvotes, "downvotes": downvotes}


def get_comment_votes(db: Session, comment_id: int) -> dict[str, int]:
    upvotes = db.query(CommentVote).filter_by(
        comment_id=comment_id, value=1).count()
    downvotes = db.query(CommentVote).filter_by(
        comment_id=comment_id, value=-1).count()
    return {"upvotes": upvotes, "downvotes": downvotes}


def remove_post_vote(db: Session, user_id: int, post_id: int) -> None:
    existing_vote = db.query(PostVote).filter_by(
        user_id=user_id, post_id=post_id).first()
    if existing_vote:
        db.delete(existing_vote)
        db.commit()


def remove_comment_vote(db: Session, user_id: int, comment_id: int) -> None:
    existing_vote = db.query(CommentVote).filter_by(
        user_id=user_id, comment_id=comment_id).first()
    if existing_vote:
        db.delete(existing_vote)
        db.commit()
