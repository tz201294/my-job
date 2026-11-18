"""The profession catalog on the server: who works in each profession.

What each profession is (descriptions, tasks, tools, in every language) is built into the website; these endpoints
give the live part: how many people are in each, and who they are.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_optional_user
from app.api.serializers import user_public_out
from app.core.professions import CATALOG, FIELD_OF
from app.db.session import get_db
from app.models import ProfessionProfile, User
from app.schemas.user import UserResponse
from app.services.moderation import hidden_user_ids

router = APIRouter()


@router.get("")
async def list_catalog(db: AsyncSession = Depends(get_db), viewer: Optional[User] = Depends(get_optional_user)):
    """Every catalog profession with its field, related professions and how many people on Prologue do it."""
    rows = (
        await db.execute(
            select(ProfessionProfile.catalog_slug, func.count())
            .where(ProfessionProfile.catalog_slug.is_not(None),
                   ProfessionProfile.user_id.not_in(hidden_user_ids(viewer)))
            .group_by(ProfessionProfile.catalog_slug)
        )
    ).all()
    counts = dict(rows)
    return [{**p, "people_count": counts.get(p["slug"], 0)} for p in CATALOG]


@router.get("/{slug}/people", response_model=List[UserResponse])
async def people_in_profession(
    slug: str,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    viewer: Optional[User] = Depends(get_optional_user),
):
    """The people who do this profession, verified first."""
    if slug not in FIELD_OF:
        raise HTTPException(status_code=404, detail="Profession not found")
    users = (
        await db.execute(
            select(User).join(ProfessionProfile, ProfessionProfile.user_id == User.id)
            .where(ProfessionProfile.catalog_slug == slug, User.is_active.is_(True),
                   User.id.not_in(hidden_user_ids(viewer)))
            .order_by(ProfessionProfile.is_verified_pro.desc(), ProfessionProfile.years_of_experience.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [await user_public_out(db, u, viewer) for u in users]
