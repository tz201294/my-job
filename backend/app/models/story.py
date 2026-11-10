import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Story(Base):
    __tablename__ = "stories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    media_url = Column(String(512), nullable=False)
    media_type = Column(String(32), default="image")  # "image" | "video"
    caption = Column(Text, nullable=True)
    profession_tag = Column(String(64), index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(hours=24), index=True)
    is_pinned_highlight = Column(Boolean, default=False)
    highlight_collection_name = Column(String(64), nullable=True)
    views_count = Column(Integer, default=0)

    author = relationship("User", back_populates="stories")
