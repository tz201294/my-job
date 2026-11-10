from pydantic import BaseModel
from typing import Optional, List


class ProfessionBase(BaseModel):
    industry: str  # e.g., "Trades", "Tech", "Healthcare", "Legal"
    title: str  # e.g., "Master Plumber", "Accountant", "Bus Driver"
    specialization: Optional[str] = None
    years_of_experience: int = 0
    is_verified_pro: bool = False
    company_or_freelance: Optional[str] = None
    key_tools: List[str] = []


class ProfessionCreate(ProfessionBase):
    pass


class ProfessionUpdate(BaseModel):
    industry: Optional[str] = None
    title: Optional[str] = None
    specialization: Optional[str] = None
    years_of_experience: Optional[int] = None
    company_or_freelance: Optional[str] = None
    key_tools: Optional[List[str]] = None


class ProfessionResponse(ProfessionBase):
    id: str
    user_id: str

    class Config:
        from_attributes = True
