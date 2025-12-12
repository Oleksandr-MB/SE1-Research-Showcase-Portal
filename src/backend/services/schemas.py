import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from src.database.models import UserRole, PostPhase


class UserBase(BaseModel):
    username: str


class UserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr


class UserRead(BaseModel):
    id: int
    username: str
    role: str
    email: str
    created_at: datetime.datetime

    display_name: Optional[str] = None
    bio: Optional[str] = None
    affiliation: Optional[str] = None
    orcid: Optional[str] = None
    arxiv: Optional[str] = None
    website: Optional[str] = None
    twitter: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None

    is_profile_public: Optional[bool] = True
    is_orcid_public: Optional[bool] = True
    is_socials_public: Optional[bool] = True
    is_arxiv_public: Optional[bool] = True

    class Config:
        from_attributes = True  



class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class PostBase(BaseModel):
    title: str
    body: str
    abstract: Optional[str] = None
    authors_text: str
    bibtex: Optional[str] = None


class PostCreate(PostBase):
    tags: Optional[list[str]] = None
    attachments: Optional[list[str]] = None
    phase: PostPhase = PostPhase.DRAFT


class PostRead(PostBase):
    id: int
    poster_id: int
    poster_username: str
    created_at: datetime.datetime
    tags: Optional[list[str]] = None
    attachments: Optional[list[str]] = None
    phase: PostPhase
    upvotes: int = 0
    downvotes: int = 0

    class Config:
        from_attributes = True


class AttachmentUploadResponse(BaseModel):
    file_path: str
    mime_type: str
    original_filename: str


class CommentBase(BaseModel):
    id: int
    post_id: int
    commenter_id: int
    parent_comment_id: Optional[int] = None
    body: str
    created_at: datetime.datetime


class CommentCreate(BaseModel):
    body: str


class CommentRead(CommentBase):
    body: str
    
    class Config:
        from_attributes = True


class CommentWrite(BaseModel):
    body: str
    parent_comment_id: Optional[int] = None


class CommentThreadRead(BaseModel):
    id: int
    post_id: int
    commenter_id: int
    commenter_username: str
    parent_comment_id: Optional[int] = None
    body: str
    created_at: datetime.datetime
    upvotes: int = 0
    downvotes: int = 0


class VoteRequest(BaseModel):
    value: int

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: int) -> int:
        if v not in (-1, 0, 1):
            raise ValueError("Vote value must be -1, 0, or 1")
        return v


class VoteResponse(BaseModel):
    upvotes: int
    downvotes: int


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    affiliation: Optional[str] = None
    orcid: Optional[str] = None
    arxiv: Optional[str] = None
    website: Optional[str] = None
    twitter: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None

    is_profile_public: Optional[bool] = None
    is_orcid_public: Optional[bool] = None
    is_socials_public: Optional[bool] = None
    is_arxiv_public: Optional[bool] = None


class ReviewCreate(BaseModel):
    """
    Schema for creating a review.
    
    Only accepts the user-provided data. The backend automatically fills in:
    - id: Auto-generated primary key
    - post_id: From URL parameter (path)
    - reviewer_id: From authenticated user token
    - created_at: Auto-generated timestamp
    """
    body: str
    is_positive: bool


class ReviewRead(BaseModel):
    """
    Schema for reading/returning review data to the client.
    
    Contains ALL fields from the database Review table:
    - id: Auto-generated primary key
    - post_id: ID of the reviewed post
    - reviewer_id: ID of the user who wrote the review
    - reviewer_username: Username of reviewer (for display)
    - body: The review text content
    - is_positive: Boolean sentiment (True = positive/upvote, False = negative/downvote)
    - created_at: Auto-generated timestamp
    
    This is returned when:
    1. Creating a review (POST) - returns the newly created review with all fields populated
    2. Fetching reviews (GET) - returns list of reviews with all their data
    """
    id: int
    post_id: int
    reviewer_id: int
    reviewer_username: str
    body: str
    is_positive: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


