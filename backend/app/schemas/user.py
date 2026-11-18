import re
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.core.taxonomy import INDUSTRY_OPTIONS, INTEREST_OPTIONS
from app.schemas.common import NonEmptyStr, OptionalHttpUrlStr, OptionalStr, PartialUpdate
from app.schemas.profession import ProfessionResponse

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,30}$")
MAX_PASSWORD_BYTES = 72  # bcrypt limit


class Gender(str, Enum):
    FEMALE = "female"
    MALE = "male"
    NON_BINARY = "non_binary"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class NonWorkingStatus(str, Enum):
    STUDENT = "student"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"
    OTHER = "other"


class EducationLevel(str, Enum):
    HIGH_SCHOOL = "high_school"
    VOCATIONAL = "vocational"
    BACHELORS = "bachelors"
    MASTERS = "masters"
    DOCTORATE = "doctorate"
    OTHER = "other"


class SignupProfession(BaseModel):
    """Work details a user enters when they say they work. Verification is never user-settable."""
    industry: str
    title: str = Field(min_length=2, max_length=128)
    specialization: Optional[str] = Field(default=None, max_length=128)
    years_of_experience: int = Field(default=0, ge=0, le=70)
    company_or_freelance: Optional[str] = Field(default=None, max_length=128)

    @field_validator("industry")
    @classmethod
    def industry_must_be_known(cls, v: str) -> str:
        if v not in INDUSTRY_OPTIONS:
            raise ValueError("Unknown industry")
        return v

    @field_validator("title", "specialization", "company_or_freelance")
    @classmethod
    def strip_text(cls, v):
        return v.strip() if isinstance(v, str) else v


class UserCreate(BaseModel):
    username: str
    password: str = Field(min_length=8)
    full_name: Optional[str] = Field(default=None, max_length=128)
    email: Optional[EmailStr] = None

    # --- Onboarding survey (stored for later analysis) ---
    works: bool
    profession: Optional[SignupProfession] = None
    non_working_status: Optional[NonWorkingStatus] = None
    interests: List[str] = Field(min_length=1)
    gender: Gender
    age: int = Field(ge=13, le=120)
    country: Optional[str] = Field(default=None, max_length=64)
    education_level: Optional[EducationLevel] = None
    data_consent: bool = False
    # Agreeing to the Terms of Service and having read the Privacy Policy (the sign-up checkbox).
    accept_terms: bool = Field(default=False, validate_default=True)

    @field_validator("accept_terms")
    @classmethod
    def terms_accepted(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Please accept the Terms of Service and Privacy Policy to create an account")
        return v

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        v = v.strip()
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3-30 characters: letters, numbers and underscores only")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError("Password must be at most 72 bytes")
        return v

    @field_validator("full_name", "country")
    @classmethod
    def blank_to_none(cls, v):
        v = v.strip() if isinstance(v, str) else v
        return v or None

    @field_validator("interests")
    @classmethod
    def interests_known_and_unique(cls, v: List[str]) -> List[str]:
        unknown = [i for i in v if i not in INTEREST_OPTIONS]
        if unknown:
            raise ValueError(f"Unknown interests: {', '.join(unknown)}")
        return list(dict.fromkeys(v))

    @model_validator(mode="after")
    def work_status_consistency(self):
        if self.works:
            if self.profession is None:
                raise ValueError("Profession details are required when you work")
            self.non_working_status = None
        else:
            self.profession = None
        return self


class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserResponse(BaseModel):
    """Public profile."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    full_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    profession: Optional[ProfessionResponse] = None
    followers_count: int = 0
    following_count: int = 0
    is_following: bool = False  # whether the signed-in viewer follows this user
    is_blocked: bool = False  # whether the signed-in viewer blocked this user
    posts_count: int = 0
    rating: Optional[float] = None  # average of this user's reviewed posts


class SurveyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    works: bool
    non_working_status: Optional[str] = None
    gender: str
    age: int
    country: Optional[str] = None
    education_level: Optional[str] = None
    data_consent: bool = False


class UserMeResponse(UserResponse):
    """The signed-in user's own account, including private onboarding answers."""
    email: Optional[str] = None
    email_verified: bool = False  # confirmed through the link sent to it
    is_admin: bool = False  # sees the Moderation page
    survey: Optional[SurveyResponse] = None
    interests: List[str] = []


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserMeResponse


def _check_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(v.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError("Password must be at most 72 bytes")
    return v


class ProfileUpdate(PartialUpdate):
    """What the signed-in user can change in Settings. Only the fields sent are changed.

    `profession` sets or replaces your work details (you work); `works: false` removes them.
    Your sign-up survey answers are kept as given, except `data_consent`, which you can change any time.
    """
    REQUIRED = ("full_name", "interests")

    full_name: Optional[NonEmptyStr(128)] = None
    bio: OptionalStr(1000) = None
    avatar_url: OptionalHttpUrlStr = None
    email: Optional[EmailStr] = None
    interests: Optional[List[str]] = None
    works: Optional[bool] = None
    profession: Optional[SignupProfession] = None
    data_consent: Optional[bool] = None

    @field_validator("avatar_url")
    @classmethod
    def avatar_fits_column(cls, v):
        if v is not None and len(v) > 512:
            raise ValueError("Photo link must be at most 512 characters")
        return v

    @field_validator("email", mode="before")
    @classmethod
    def blank_email_to_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

    @field_validator("interests")
    @classmethod
    def interests_known_and_unique(cls, v):
        if v is None:
            return v
        if not v:
            raise ValueError("Choose at least one interest")
        unknown = [i for i in v if i not in INTEREST_OPTIONS]
        if unknown:
            raise ValueError(f"Unknown interests: {', '.join(unknown)}")
        return list(dict.fromkeys(v))

    @model_validator(mode="after")
    def work_fields_consistent(self):
        if self.works is False and self.profession is not None:
            raise ValueError("Leave profession empty when you don't work")
        if self.works is True and "profession" not in self.model_fields_set:
            raise ValueError("Profession details are required when you work")
        return self


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_rules(cls, v: str) -> str:
        return _check_password(v)


class AccountDelete(BaseModel):
    password: str


class ForgotPassword(BaseModel):
    username_or_email: str = Field(min_length=1, max_length=255)


class PasswordReset(BaseModel):
    token: str = Field(min_length=1, max_length=2000)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_rules(cls, v: str) -> str:
        return _check_password(v)


class EmailVerify(BaseModel):
    token: str = Field(min_length=1, max_length=2000)
