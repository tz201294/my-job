from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class ProfessionBase(BaseModel):
    industry: str  # e.g., "Trades", "Tech", "Healthcare", "Legal"
    title: str  # e.g., "Master Plumber", "Accountant", "Bus Driver"
    specialization: Optional[str] = None
    years_of_experience: int = 0
    is_verified_pro: bool = False
    company_or_freelance: Optional[str] = None
    key_tools: List[str] = []


class ProfessionResponse(ProfessionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
