import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
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
    created_at = Column(DateTime, default=datetime.utcnow)


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
    created_at = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime, nullable=True)


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
    created_at = Column(DateTime, default=datetime.utcnow)

    suggestions = relationship("ChallengeSuggestion", back_populates="challenge", cascade="all, delete-orphan")


class ChallengeSuggestion(Base):
    __tablename__ = "challenge_suggestions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id = Column(String, ForeignKey("work_challenges.id", ondelete="CASCADE"), index=True, nullable=False)
    suggester_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    suggestion_text = Column(Text, nullable=False)
    suggested_tool_or_reference = Column(String(255), nullable=True)
    upvotes_count = Column(Integer, default=0)
    is_accepted_by_worker = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    challenge = relationship("WorkChallenge", back_populates="suggestions")
