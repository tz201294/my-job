from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.serializers import story_out
from app.core.time import utcnow
from app.db.session import get_db
from app.models import Story, User
from app.schemas.story import StoryCreate, StoryResponse, UserStoryGroup

router = APIRouter()


@router.get("/feed", response_model=List[UserStoryGroup])
async def get_stories_feed(db: AsyncSession = Depends(get_db)):
    """Returns active 24-hour stories grouped by user for the top story tray."""
    stories = (
        await db.execute(
            select(Story).where(Story.expires_at > utcnow()).order_by(Story.created_at.desc())
        )
    ).scalars().all()

    groups = {}
    for s in stories:
        item = story_out(s)
        if s.user_id not in groups:
            groups[s.user_id] = {
                "user_id": s.user_id,
                "username": item["author_username"],
                "avatar_url": item["author_avatar_url"],
                "profession_title": item["author_profession_title"],
                "has_unseen": True,
                "stories": [],
            }
        groups[s.user_id]["stories"].append(item)
    return list(groups.values())


@router.post("", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
async def create_story(
    story_in: StoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Creates a new 24h expiring story for the signed-in user."""
    story = Story(
        user_id=user.id,
        media_url=story_in.media_url,
        media_type=story_in.media_type.value,
        caption=story_in.caption,
        profession_tag=story_in.profession_tag,
    )
    db.add(story)
    await db.commit()
    story = (await db.execute(select(Story).where(Story.id == story.id))).scalar_one()
    return story_out(story)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_story(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The author deletes their story before it expires."""
    story = (await db.execute(select(Story).where(Story.id == story_id))).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own stories")
    await db.delete(story)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
