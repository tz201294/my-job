from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from enum import Enum

from app.schemas.common import OptionalHttpUrlStr


class TaskDifficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class TaskStep(BaseModel):
    step_number: int
    title: str
    description: str
    image_url: Optional[str] = None
    tip: Optional[str] = None


class TaskStepCreate(TaskStep):
    image_url: OptionalHttpUrlStr = None


class TaskDetailsBase(BaseModel):
    problem_statement: str
    category: str
    difficulty: TaskDifficulty = TaskDifficulty.INTERMEDIATE
    estimated_time_mins: Optional[int] = None
    tools_used: List[str] = []
    steps: List[TaskStep] = []
    safety_warnings: Optional[str] = None


class TaskDetailsCreate(TaskDetailsBase):
    steps: List[TaskStepCreate] = []


class TaskDetailsResponse(TaskDetailsBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    post_id: str
