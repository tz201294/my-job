from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from app.schemas.common import HttpUrlStr, NonEmptyStr, PartialUpdate, Tags
from app.schemas.task import TaskDetailsBase, TaskDetailsCreate, TaskDetailsResponse


class PostType(str, Enum):
    GENERAL_POST = "general_post"           # Achievements, milestones, desk setups, thoughts
    PRO_CASE_STUDY = "pro_case_study"       # Deep-dive profession breakdown (e.g. "How to write a subpoena")
    TASK_WALKTHROUGH = "task_walkthrough"   # Step-by-step practical trade or coding walkthrough
    REEL = "reel"                           # Short-form video clip


class MediaItem(BaseModel):
    url: str
    media_type: str = "image"  # "image" | "video"
    caption: Optional[str] = None


class MediaItemCreate(MediaItem):
    url: HttpUrlStr


class PostBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    caption: str = Field(min_length=1)
    post_type: PostType = PostType.GENERAL_POST
    media: List[MediaItem] = []
    tags: List[str] = []


class PostCreate(PostBase):
    media: List[MediaItemCreate] = []
    tags: Tags = []
    task_details: Optional[TaskDetailsCreate] = None


class PostUpdate(PartialUpdate):
    """Fields the author can change. The post type is fixed once published.
    Sending task_details replaces the whole walkthrough; sending null removes it."""
    REQUIRED = ("title", "caption", "media", "tags")
    title: Optional[NonEmptyStr(255)] = None
    caption: Optional[NonEmptyStr(20000)] = None
    media: Optional[List[MediaItemCreate]] = None
    tags: Optional[Tags] = None
    task_details: Optional[TaskDetailsCreate] = None


class PostResponse(PostBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    author_id: str
    author_username: str
    author_full_name: str
    author_avatar_url: Optional[str] = None
    author_profession_title: Optional[str] = None
    author_industry: Optional[str] = None
    is_author_verified: bool = False
    rating: Optional[float] = None  # None until the post has at least one review
    reviews_count: int = 0
    likes_count: int = 0
    comments_count: int = 0
    is_liked_by_me: bool = False
    is_bookmarked_by_me: bool = False
    task_details: Optional[TaskDetailsResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
