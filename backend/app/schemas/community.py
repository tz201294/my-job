from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from typing import Annotated, Optional, List
from datetime import datetime
from enum import Enum

from app.schemas.common import OptionalHttpUrlStr


class ReviewRating(int, Enum):
    ONE = 1
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5


class TaskReviewCreate(BaseModel):
    post_id: str
    clarity_score: int = Field(ge=1, le=5, description="How clearly the workflow was explained (1-5)")
    accuracy_score: int = Field(ge=1, le=5, description="Technical accuracy and best practice adherence (1-5)")
    feedback_text: str
    reviewer_profession: Optional[str] = None  # If reviewer is also a pro (e.g., peer review)


class TaskReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    post_id: str
    user_id: str
    username: str
    user_avatar_url: Optional[str] = None
    is_peer_verified: bool = False
    reviewer_profession: Optional[str] = None
    clarity_score: int
    accuracy_score: int
    feedback_text: str
    created_at: datetime


# Q&A Segment Schemas
class QAQuestionCreate(BaseModel):
    question_text: str
    topic_tag: Optional[str] = None  # e.g., "Career Advice", "Tool Choice", "Salary & Routine"


class QAAnswerCreate(BaseModel):
    answer_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
    video_response_url: OptionalHttpUrlStr = None


class QAQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    worker_id: str
    asker_id: str
    asker_username: str
    asker_full_name: Optional[str] = None
    asker_avatar_url: Optional[str] = None
    worker_username: Optional[str] = None
    worker_full_name: Optional[str] = None
    worker_profession_title: Optional[str] = None
    worker_avatar_url: Optional[str] = None
    question_text: str
    topic_tag: Optional[str] = None
    answer_text: Optional[str] = None
    video_response_url: Optional[str] = None
    is_answered: bool = False
    upvotes_count: int = 0
    upvoted_by_me: bool = False
    created_at: datetime
    answered_at: Optional[datetime] = None


class QASessionResponse(BaseModel):
    worker_id: str
    worker_name: str
    worker_profession: str
    total_questions: int
    answered_questions: int
    questions: List[QAQuestionResponse]


# Crowdsourced Problem & Brainstorming Challenge Schemas
class ChallengeSuggestionCreate(BaseModel):
    suggestion_text: str
    suggested_tool_or_reference: Optional[str] = None


class ChallengeSuggestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    challenge_id: str
    suggester_id: str
    suggester_username: str
    suggester_profession: Optional[str] = None
    suggestion_text: str
    suggested_tool_or_reference: Optional[str] = None
    upvotes_count: int = 0
    upvoted_by_me: bool = False
    is_accepted_by_worker: bool = False
    created_at: datetime


class WorkChallengeCreate(BaseModel):
    title: str
    scenario_description: str
    profession_category: str
    media_url: OptionalHttpUrlStr = None
    urgency_level: str = "medium"  # "low" | "medium" | "urgent" | "brainstorming"


class WorkChallengeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    worker_id: str
    worker_username: str
    worker_full_name: Optional[str] = None
    worker_profession_title: str
    worker_avatar_url: Optional[str] = None
    title: str
    scenario_description: str
    profession_category: str
    media_url: Optional[str] = None
    urgency_level: str
    is_solved: bool = False
    suggestions: List[ChallengeSuggestionResponse] = []
    created_at: datetime
