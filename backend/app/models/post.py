import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from app.db.base import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    author_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    caption = Column(Text, nullable=False)
    post_type = Column(String(64), default="general_post", index=True)  # "general_post" | "pro_case_study" | "reel"
    media = Column(JSON, default=list)  # [{url: "...", media_type: "image", caption: "..."}]
    tags = Column(JSON, default=list)   # ["litigation", "subpoena"]
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    rating = Column(Float, default=5.0)
    reviews_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("User", back_populates="posts")
    task_details = relationship("TaskDetails", back_populates="post", uselist=False, cascade="all, delete-orphan")


class TaskDetails(Base):
    __tablename__ = "task_details"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), unique=True, nullable=False)
    problem_statement = Column(Text, nullable=False)
    category = Column(String(128), index=True, nullable=False)
    difficulty = Column(String(64), default="intermediate")
    estimated_duration = Column(String(64), nullable=True)
    tools_used = Column(JSON, default=list)
    safety_warnings = Column(Text, nullable=True)
    steps = Column(JSON, default=list)  # [{stepNumber: 1, title: "...", description: "...", imageUrl: "...", tip: "..."}]

    post = relationship("Post", back_populates="task_details")
