import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, String

from app.core.time import utcnow
from app.db.base import Base


class ViewEvent(Base):
    """Someone opened something in a profession (a post, a case study, a profile, a profession page).

    Only the profession and field are kept, not which post or profile it was: enough for the "For you" feed
    to learn what kinds of work someone looks at. Rows older than 90 days are deleted.
    """
    __tablename__ = "view_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(16), nullable=False)  # post | case_study | profile | profession
    slug = Column(String(64), nullable=True)  # catalog profession, when known
    field = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    __table_args__ = (Index("ix_view_events_user_id_created_at", "user_id", "created_at"),)
