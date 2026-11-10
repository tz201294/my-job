from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.schemas.profession import ProfessionResponse, ProfessionCreate


class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str
    profession: Optional[ProfessionCreate] = None


class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserResponse(UserBase):
    id: str
    is_active: bool = True
    created_at: datetime
    profession: Optional[ProfessionResponse] = None
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
