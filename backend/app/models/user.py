import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(128), nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profession = relationship("ProfessionProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    stories = relationship("Story", back_populates="author", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")


class ProfessionProfile(Base):
    __tablename__ = "profession_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    industry = Column(String(128), index=True, nullable=False)
    title = Column(String(128), index=True, nullable=False)
    specialization = Column(String(128), nullable=True)
    years_of_experience = Column(Integer, default=0)
    is_verified_pro = Column(Boolean, default=False)
    company_or_freelance = Column(String(128), nullable=True)
    key_tools = Column(JSON, default=list)  # Stored as JSON array: ["Westlaw", "FRCP 45"]

    user = relationship("User", back_populates="profession")
