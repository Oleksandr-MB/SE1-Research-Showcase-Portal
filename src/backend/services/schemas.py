
from typing import Optional
from pydantic import BaseModel, EmailStr
from backend.db.models import UserRole


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
