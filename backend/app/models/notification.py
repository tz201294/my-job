import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import relationship

from app.core.time import utcnow
from app.db.base import Base


class Notification(Base):
    """Something that happened to `user_id`'s content or account, caused by `actor_id`.

    `type` is one of: follow, question, answer, suggestion, accepted, review, comment, reaction.
    The *_id columns point at what it is about; `snippet` keeps a short preview so the list still reads
    well if the target is later edited.
    """
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(32), nullable=False)
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    comment_id = Column(String, ForeignKey("post_comments.id", ondelete="CASCADE"), nullable=True)
    question_id = Column(String, ForeignKey("qa_questions.id", ondelete="CASCADE"), nullable=True)
    challenge_id = Column(String, ForeignKey("work_challenges.id", ondelete="CASCADE"), nullable=True)
    suggestion_id = Column(String, ForeignKey("challenge_suggestions.id", ondelete="CASCADE"), nullable=True)
    snippet = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)

    actor = relationship("User", foreign_keys=[actor_id], lazy="selectin")

    __table_args__ = (Index("ix_notifications_user_id_created_at", "user_id", "created_at"),)
