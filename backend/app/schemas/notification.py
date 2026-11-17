from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    type: str  # follow | question | answer | suggestion | accepted | review | comment | reaction
    actor_id: str
    actor_username: str
    actor_full_name: Optional[str] = None
    actor_avatar_url: Optional[str] = None
    post_id: Optional[str] = None
    comment_id: Optional[str] = None
    question_id: Optional[str] = None
    challenge_id: Optional[str] = None
    suggestion_id: Optional[str] = None
    snippet: Optional[str] = None
    created_at: datetime
    read: bool = False


class NotificationPage(BaseModel):
    unread_count: int
    total: int
    notifications: List[NotificationResponse]


class MarkRead(BaseModel):
    """Notification ids to mark as read; leave out (or null) to mark everything read."""
    ids: Optional[List[str]] = None
