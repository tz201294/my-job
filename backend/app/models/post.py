import uuid
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from app.core.time import utcnow
from app.db.base import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    author_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    caption = Column(Text, nullable=False)
    post_type = Column(String(64), default="general_post", index=True)  # "general_post" | "pro_case_study" | "task_walkthrough" | "reel"
    media = Column(JSON, default=list)  # [{url: "...", media_type: "image", caption: "..."}]
    tags = Column(JSON, default=list)   # ["litigation", "subpoena"]
    likes_count = Column(Integer, default=0, nullable=False)
    comments_count = Column(Integer, default=0, nullable=False)
    rating = Column(Float, default=5.0)
    reviews_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    author = relationship("User", back_populates="posts", lazy="selectin")
    task_details = relationship(
        "TaskDetails", back_populates="post", uselist=False,
        cascade="all, delete-orphan", lazy="selectin",
    )
    likes = relationship("PostLike", cascade="all, delete-orphan")


class PostLike(Base):
    __tablename__ = "post_likes"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=utcnow)


class TaskDetails(Base):
    __tablename__ = "task_details"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id", ondelete="CASCADE"), unique=True, nullable=False)
    problem_statement = Column(Text, nullable=False)
    category = Column(String(128), index=True, nullable=False)
    difficulty = Column(String(64), default="intermediate")
    estimated_time_mins = Column(Integer, nullable=True)
    tools_used = Column(JSON, default=list)
    safety_warnings = Column(Text, nullable=True)
    steps = Column(JSON, default=list)  # [{step_number: 1, title: "...", description: "...", image_url: "...", tip: "..."}]

    post = relationship("Post", back_populates="task_details")
