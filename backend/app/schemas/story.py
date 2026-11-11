from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"


class StoryBase(BaseModel):
    media_url: str
    media_type: MediaType = MediaType.IMAGE
    caption: Optional[str] = None
    profession_tag: Optional[str] = None


class StoryCreate(StoryBase):
    pass


class StoryResponse(StoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    author_username: str
    author_full_name: Optional[str] = None
    author_avatar_url: Optional[str] = None
    author_profession_title: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    is_pinned_highlight: bool = False
    highlight_collection_name: Optional[str] = None
    views_count: int = 0


class UserStoryGroup(BaseModel):
    user_id: str
    username: str
    avatar_url: Optional[str] = None
    profession_title: Optional[str] = None
    has_unseen: bool = True
    stories: List[StoryResponse]
