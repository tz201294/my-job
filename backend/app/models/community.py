import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.time import utcnow
from app.db.base import Base


class TaskReview(Base):
    __tablename__ = "task_reviews"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    clarity_score = Column(Integer, nullable=False)   # 1-5
    accuracy_score = Column(Integer, nullable=False)  # 1-5
    feedback_text = Column(Text, nullable=False)
    reviewer_profession = Column(String(128), nullable=True)
    is_peer_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", lazy="selectin")


class QAQuestion(Base):
    __tablename__ = "qa_questions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    asker_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    question_text = Column(Text, nullable=False)
    topic_tag = Column(String(64), default="General Inquiry")
    answer_text = Column(Text, nullable=True)
    video_response_url = Column(String(512), nullable=True)
    is_answered = Column(Boolean, default=False)
    upvotes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
    answered_at = Column(DateTime, nullable=True)

    worker = relationship("User", foreign_keys=[worker_id], lazy="selectin")
    asker = relationship("User", foreign_keys=[asker_id], lazy="selectin")


class QAUpvote(Base):
    __tablename__ = "qa_upvotes"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    question_id = Column(String, ForeignKey("qa_questions.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=utcnow)


class SuggestionUpvote(Base):
    __tablename__ = "suggestion_upvotes"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    suggestion_id = Column(String, ForeignKey("challenge_suggestions.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=utcnow)


class WorkChallenge(Base):
    __tablename__ = "work_challenges"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    scenario_description = Column(Text, nullable=False)
    profession_category = Column(String(128), index=True, nullable=False)
    media_url = Column(String(512), nullable=True)
    urgency_level = Column(String(64), default="Brainstorming")
    is_solved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    worker = relationship("User", lazy="selectin")
    suggestions = relationship(
        "ChallengeSuggestion", back_populates="challenge",
        cascade="all, delete-orphan", lazy="selectin", order_by="ChallengeSuggestion.created_at",
    )


class ChallengeSuggestion(Base):
    __tablename__ = "challenge_suggestions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id = Column(String, ForeignKey("work_challenges.id", ondelete="CASCADE"), index=True, nullable=False)
    suggester_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    suggestion_text = Column(Text, nullable=False)
    suggested_tool_or_reference = Column(String(255), nullable=True)
    upvotes_count = Column(Integer, default=0)
    is_accepted_by_worker = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    challenge = relationship("WorkChallenge", back_populates="suggestions")
    suggester = relationship("User", lazy="selectin")
