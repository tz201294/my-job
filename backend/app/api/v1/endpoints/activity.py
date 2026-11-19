"""What the signed-in person opens, so the "For you" feed can learn which professions they look at."""
from typing import Literal

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.rate_limits import allow_silently
from app.db.session import get_db
from app.models import User
from app.services.feed import record_view

router = APIRouter()


class ViewIn(BaseModel):
    kind: Literal["post", "case_study", "profile", "profession"]
    id: str = Field(min_length=1, max_length=128)  # post id, username or profession slug


@router.post("/views", status_code=status.HTTP_204_NO_CONTENT)
async def record_open(body: ViewIn, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Notes the profession of something the person opened (never which post or profile it was).
    Over the silent limit, opens just aren't counted: browsing a lot is fine and never fails."""
    if allow_silently("view", user.id):
        await record_view(db, user, body.kind, body.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
