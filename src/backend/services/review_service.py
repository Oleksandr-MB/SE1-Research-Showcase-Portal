from typing import Annotated
from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from src.database.db import get_db
from src.database import models
from src.backend.services.schemas import ReviewCreate, ReviewRead
from src.backend.services.user_service import get_current_user

router = APIRouter()


@router.post("/posts/{post_id}/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(
    post_id: int,
    review_data: ReviewCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a review for a post"""
    # Check if post exists
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    # Check if user is researcher or moderator
    if current_user.role not in ["researcher", "moderator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only researchers and moderators can create reviews",
        )

    # Check if user already reviewed this post
    existing_review = db.query(models.Review).filter(
        models.Review.post_id == post_id,
        models.Review.reviewer_id == current_user.id,
    ).first()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this post",
        )

    # Create review
    review = models.Review(
        post_id=post_id,
        reviewer_id=current_user.id,
        body=review_data.body,
        is_positive=review_data.is_positive,
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return ReviewRead(
        id=review.id,
        post_id=review.post_id,
        reviewer_id=review.reviewer_id,
        reviewer_username=current_user.username,
        body=review.body,
        is_positive=review.is_positive,
        created_at=review.created_at,
    )


@router.get("/posts/{post_id}/reviews", response_model=list[ReviewRead])
async def get_post_reviews(
    post_id: int,
    db: Session = Depends(get_db),
):
    """Get all reviews for a post"""
    reviews = db.query(models.Review).filter(models.Review.post_id == post_id).all()
    
    result = []
    for review in reviews:
        reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
        result.append(
            ReviewRead(
                id=review.id,
                post_id=review.post_id,
                reviewer_id=review.reviewer_id,
                reviewer_username=reviewer.username if reviewer else "Unknown",
                body=review.body,
                is_positive=review.is_positive,
                created_at=review.created_at,
            )
        )
    
    return result
