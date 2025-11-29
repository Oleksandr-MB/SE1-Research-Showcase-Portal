import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from src.database.models import UserRole


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
    id: int
    title: str
    body: str
    poster_id: int
    share_link: Optional[str] = None
    created_at: datetime.datetime


class PostCreate(PostBase):
    abstract: Optional[str] = None
    authors_text: str
    bibtex: Optional[str] = None
    tags: Optional[list[str]] = None
    attachments: Optional[list[str]] = None


class PostRead(PostBase):
    abstract: Optional[str] = None
    authors_text: str
    bibtex: Optional[str] = None
    tags: Optional[list[str]] = None
    attachments: Optional[list[str]] = None

    class Config:
        from_attributes = True


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
