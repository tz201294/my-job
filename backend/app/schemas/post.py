from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum
from app.schemas.task import TaskDetailsBase, TaskDetailsCreate, TaskDetailsResponse


class PostType(str, Enum):
    STANDARD = "standard"
    TASK_WALKTHROUGH = "task_walkthrough"
    REEL = "reel"


class MediaItem(BaseModel):
    url: str
    media_type: str = "image"  # "image" | "video"
    caption: Optional[str] = None


class PostBase(BaseModel):
    title: str
    caption: str
    post_type: PostType = PostType.STANDARD
    media: List[MediaItem] = []
    tags: List[str] = []


class PostCreate(PostBase):
    task_details: Optional[TaskDetailsCreate] = None


class PostResponse(PostBase):
    id: str
    author_id: str
    author_username: str
    author_full_name: str
    author_avatar_url: Optional[str] = None
    author_profession_title: Optional[str] = None
    is_author_verified: bool = False
    likes_count: int = 0
    comments_count: int = 0
    is_liked_by_me: bool = False
    is_bookmarked_by_me: bool = False
    task_details: Optional[TaskDetailsResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
