
from typing import Optional
from pydantic import BaseModel, EmailStr
from src.backend.db.models import UserRole


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str
    email: EmailStr


class UserRead(UserBase):
    id: int
    role: UserRole
    email: Optional[EmailStr] = None

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
    content: str
    poster_id: int
    share_link: Optional[str] = None


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
