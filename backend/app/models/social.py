from sqlalchemy import Column, DateTime, ForeignKey, String

from app.core.time import utcnow
from app.db.base import Base


class Follow(Base):
    """`follower_id` follows `followee_id`. One row per pair."""
    __tablename__ = "follows"

    follower_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    followee_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
    created_at = Column(DateTime, default=utcnow)


class Bookmark(Base):
    """A post saved by a user (private to that user)."""
    __tablename__ = "bookmarks"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=utcnow)
