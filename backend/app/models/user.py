import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.time import utcnow
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(64), unique=True, index=True, nullable=False)  # stored lower-case
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(128), nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    # Login tokens issued before this moment are rejected (set when the password changes).
    password_changed_at = Column(DateTime, nullable=True)
    # When the email address was confirmed through the link sent to it; null = not confirmed. Reset to null when
    # the address changes. Password-reset links are only sent to confirmed addresses.
    email_verified_at = Column(DateTime, nullable=True)

    # Relationships
    profession = relationship(
        "ProfessionProfile", back_populates="user", uselist=False,
        cascade="all, delete-orphan", lazy="selectin",
    )
    survey = relationship("UserSurvey", back_populates="user", uselist=False, cascade="all, delete-orphan")
    interests = relationship("UserInterest", back_populates="user", cascade="all, delete-orphan")
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


class UserSurvey(Base):
    """Demographic / onboarding answers collected at sign-up, kept for later analysis.

    Work details (industry, title, experience) live in `ProfessionProfile`;
    chosen interests live in `UserInterest`.
    """
    __tablename__ = "user_surveys"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    works = Column(Boolean, nullable=False, index=True)
    non_working_status = Column(String(32), nullable=True, index=True)  # student | unemployed | retired | other
    gender = Column(String(32), nullable=False, index=True)
    age = Column(Integer, nullable=False)  # age at sign-up (see created_at)
    country = Column(String(64), nullable=True, index=True)
    education_level = Column(String(32), nullable=True)
    data_consent = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="survey")


class UserInterest(Base):
    """One row per (user, interest) so multi-select answers are easy to aggregate."""
    __tablename__ = "user_interests"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    interest = Column(String(128), primary_key=True, index=True)

    user = relationship("User", back_populates="interests")
