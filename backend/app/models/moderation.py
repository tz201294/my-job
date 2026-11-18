import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text

from app.core.time import utcnow
from app.db.base import Base


class Block(Base):
    """`blocker_id` blocked `blocked_id`. Neither sees the other's content, and they can't interact (follow,
    comment, ask, suggest, notify). One row per pair."""
    __tablename__ = "blocks"

    blocker_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    blocked_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
    created_at = Column(DateTime, default=utcnow)


class Report(Base):
    """Someone reported a post, comment, question, challenge, idea or account to the moderators.

    `target_id` isn't a foreign key: the target can be any of several tables, and reports are kept (resolved)
    after the content is removed, as a record of what was done.
    """
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_type = Column(String(16), nullable=False)  # post | comment | question | challenge | suggestion | user
    target_id = Column(String, nullable=False)
    # Whose content it is, so a ban can be decided without loading the target, and so it can be found after
    # the content is gone.
    target_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    reason = Column(String(32), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(16), nullable=False, default="open")  # open | dismissed | removed | banned
    created_at = Column(DateTime, default=utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        Index("ix_reports_status_target", "status", "target_type", "target_id"),
    )
