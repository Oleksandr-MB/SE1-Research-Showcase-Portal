from typing import Annotated
from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from src.database.db import get_db
from src.database import models
from src.backend.services.schemas import ReviewCreate, ReviewRead, VoteRequest
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

    # Only researchers may create reviews
    if current_user.role != "researcher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only researchers can create reviews",
        )

    # Researchers cannot review their own posts
    if post.poster_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot review your own post",
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
        strengths=review_data.strengths,
        weaknesses=review_data.weaknesses,
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    # Check if post author should be promoted to researcher
    # Count positive reviews for this specific post
    positive_review_count = db.query(models.Review).filter(
        models.Review.post_id == post_id,
        models.Review.is_positive == True,
    ).count()

    # If 3+ positive reviews, promote the post author to researcher
    if positive_review_count >= 3:
        post_author = db.query(models.User).filter(models.User.id == post.poster_id).first()
        if post_author and post_author.role == models.UserRole.USER:
            post_author.role = models.UserRole.RESEARCHER
            db.commit()

    upvotes = sum(1 for vote in review.review_votes if vote.value == 1)
    downvotes = sum(1 for vote in review.review_votes if vote.value == -1)

    return ReviewRead(
        id=review.id,
        post_id=review.post_id,
        reviewer_id=review.reviewer_id,
        reviewer_username=current_user.username,
        body=review.body,
        is_positive=review.is_positive,
        strengths=review.strengths,
        weaknesses=review.weaknesses,
        upvotes=upvotes,
        downvotes=downvotes,
        created_at=review.created_at,
    )


@router.get("/posts/{post_id}/reviews", response_model=list[ReviewRead])
async def get_post_reviews(
    post_id: int,
    db: Session = Depends(get_db),
):
    """Get all reviews for a post"""
    from sqlalchemy.orm import joinedload
    reviews = (
        db.query(models.Review)
        .options(joinedload(models.Review.review_votes))
        .filter(models.Review.post_id == post_id)
        .all()
    )
    
    result = []
    for review in reviews:
        reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
        upvotes = sum(1 for vote in review.review_votes if vote.value == 1)
        downvotes = sum(1 for vote in review.review_votes if vote.value == -1)
        result.append(
            ReviewRead(
                id=review.id,
                post_id=review.post_id,
                reviewer_id=review.reviewer_id,
                reviewer_username=reviewer.username if reviewer else "Unknown",
                body=review.body,
                is_positive=review.is_positive,
                strengths=review.strengths,
                weaknesses=review.weaknesses,
                # upvotes=upvotes,
                # downvotes=downvotes,
                created_at=review.created_at,
            )
        )
    
    return result


@router.get("/reviews/{review_id}", response_model=ReviewRead)
async def get_review(
    review_id: int,
    db: Session = Depends(get_db)
):
    """Get a single review by ID with vote counts"""
    from sqlalchemy.orm import joinedload
    review = (
        db.query(models.Review)
        .options(joinedload(models.Review.review_votes))
        .filter(models.Review.id == review_id)
        .first()
    )
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
    upvotes = sum(1 for vote in review.review_votes if vote.value == 1)
    downvotes = sum(1 for vote in review.review_votes if vote.value == -1)
    
    return ReviewRead(
        id=review.id,
        post_id=review.post_id,
        reviewer_id=review.reviewer_id,
        reviewer_username=reviewer.username if reviewer else "Unknown",
        body=review.body,
        is_positive=review.is_positive,
        strengths=review.strengths,
        weaknesses=review.weaknesses,
        upvotes=upvotes,
        downvotes=downvotes,
        created_at=review.created_at,
    )


@router.post("/reviews/{review_id}/vote", response_model=ReviewRead)
async def vote_on_review(
    review_id: int,
    vote: VoteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Vote on a review"""
    # Check if review exists
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check if vote already exists
    existing_vote = db.query(models.ReviewVote).filter(
        models.ReviewVote.user_id == current_user.id,
        models.ReviewVote.review_id == review_id
    ).first()
    
    if existing_vote:
        if existing_vote.value == vote.value:
            # Remove vote if same value
            db.delete(existing_vote)
        else:
            # Update vote if different value
            existing_vote.value = vote.value
    else:
        # Create new vote
        new_vote = models.ReviewVote(
            user_id=current_user.id,
            review_id=review_id,
            value=vote.value
        )
        db.add(new_vote)
    
    db.commit()
    db.refresh(review)
    
    # Return updated review with vote counts
    reviewer = db.query(models.User).filter(models.User.id == review.reviewer_id).first()
    upvotes = sum(1 for vote in review.review_votes if vote.value == 1)
    downvotes = sum(1 for vote in review.review_votes if vote.value == -1)
    
    return ReviewRead(
        id=review.id,
        post_id=review.post_id,
        reviewer_id=review.reviewer_id,
        reviewer_username=reviewer.username if reviewer else "Unknown",
        body=review.body,
        is_positive=review.is_positive,
        strengths=review.strengths,
        weaknesses=review.weaknesses,
        upvotes=upvotes,
        downvotes=downvotes,
        created_at=review.created_at,
    )
