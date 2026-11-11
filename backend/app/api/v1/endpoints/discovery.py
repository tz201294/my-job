from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.taxonomy import CATEGORIES
from app.core.time import utcnow
from app.db.session import get_db
from app.models import ProfessionProfile, Story

router = APIRouter()


@router.get("/categories")
async def get_profession_categories(db: AsyncSession = Depends(get_db)):
    """Returns the profession taxonomy with live counts of registered professionals and active stories."""
    prof_counts = dict(
        (await db.execute(
            select(ProfessionProfile.industry, func.count()).group_by(ProfessionProfile.industry)
        )).all()
    )
    now = utcnow()
    story_counts = dict(
        (await db.execute(
            select(ProfessionProfile.industry, func.count(Story.id))
            .join(Story, Story.user_id == ProfessionProfile.user_id)
            .where(Story.expires_at > now)
            .group_by(ProfessionProfile.industry)
        )).all()
    )
    return [
        {
            **c,
            "professions_count": prof_counts.get(c["name"], 0),
            "active_stories_count": story_counts.get(c["name"], 0),
        }
        for c in CATEGORIES
    ]


@router.get("/search")
async def search_professions_and_tasks(
    q: str = Query(..., min_length=1, description="Search term for profession, task, or tool"),
):
    """Searches across profession categories and their popular roles."""
    query_lower = q.lower()
    matching_categories = [
        c for c in CATEGORIES
        if query_lower in c["name"].lower() or any(query_lower in r.lower() for r in c["popular_roles"])
    ]
    return {"query": q, "matching_categories": matching_categories}
