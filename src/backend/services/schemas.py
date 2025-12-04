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


class UserRead(UserBase):
    id: int
    role: UserRole
    created_at: datetime.datetime

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


class AttachmentReference(BaseModel):
    file_path: str
    mime_type: Optional[str] = None


class PostCreate(PostBase):
    tags: Optional[list[str]] = None
    attachments: Optional[list[str | AttachmentReference]] = None
    phase: PostPhase = PostPhase.DRAFT


class PostRead(PostBase):
    id: int
    poster_id: int
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
