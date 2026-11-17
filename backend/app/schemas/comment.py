from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.common import NonEmptyStr

MAX_COMMENT_LENGTH = 2000


class CommentCreate(BaseModel):
    body: NonEmptyStr(MAX_COMMENT_LENGTH)


class CommentUpdate(BaseModel):
    body: NonEmptyStr(MAX_COMMENT_LENGTH)


class CommentResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    profession_title: Optional[str] = None
    body: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class CommentPage(BaseModel):
    """A page of comments, oldest first, with the post's total so the UI can offer "load more"."""
    total: int
    comments: list[CommentResponse]
