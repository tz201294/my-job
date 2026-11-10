from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime, timedelta
from app.schemas.story import StoryResponse, StoryCreate, UserStoryGroup, MediaType
import uuid

router = APIRouter()

MOCK_STORIES = [
    {
        "id": "story_01",
        "user_id": "usr_101",
        "author_username": "sarah_plumber",
        "author_avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        "author_profession_title": "Master Plumber",
        "media_url": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80",
        "media_type": MediaType.IMAGE,
        "caption": "Diagnostic camera run through a 40-year old cast iron main line 🛠️",
        "profession_tag": "Plumbing",
        "created_at": datetime.utcnow() - timedelta(hours=3),
        "expires_at": datetime.utcnow() + timedelta(hours=21),
        "is_pinned_highlight": False,
        "highlight_collection_name": None,
        "views_count": 342
    },
    {
        "id": "story_02",
        "user_id": "usr_102",
        "author_username": "alex_driver",
        "author_avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        "author_profession_title": "Transit Bus Operator",
        "media_url": "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
        "media_type": MediaType.IMAGE,
        "caption": "Pre-trip morning safety inspection & regenerative brake check completed 🚌✅",
        "profession_tag": "Transportation",
        "created_at": datetime.utcnow() - timedelta(hours=5),
        "expires_at": datetime.utcnow() + timedelta(hours=19),
        "is_pinned_highlight": False,
        "highlight_collection_name": None,
        "views_count": 512
    }
]


@router.get("/feed", response_model=List[UserStoryGroup])
async def get_stories_feed():
    """Returns active 24-hour stories grouped by user for the top story tray."""
    now = datetime.utcnow()
    # Filter active (non-expired) stories
    active_stories = [s for s in MOCK_STORIES if s["expires_at"] > now]
    
    # Group by author
    groups = {}
    for s in active_stories:
        uid = s["user_id"]
        if uid not in groups:
            groups[uid] = {
                "user_id": uid,
                "username": s["author_username"],
                "avatar_url": s["author_avatar_url"],
                "profession_title": s["author_profession_title"],
                "has_unseen": True,
                "stories": []
            }
        groups[uid]["stories"].append(s)
    
    return list(groups.values())


@router.post("", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
async def create_story(story_in: StoryCreate):
    """Creates a new 24h expiring story."""
    story_id = f"story_{uuid.uuid4().hex[:8]}"
    created_time = datetime.utcnow()
    expires_time = created_time + timedelta(hours=24)
    
    new_story = {
        "id": story_id,
        "user_id": "usr_101",
        "author_username": "sarah_plumber",
        "author_avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        "author_profession_title": "Master Plumber",
        "media_url": story_in.media_url,
        "media_type": story_in.media_type,
        "caption": story_in.caption,
        "profession_tag": story_in.profession_tag or "Plumbing",
        "created_at": created_time,
        "expires_at": expires_time,
        "is_pinned_highlight": False,
        "highlight_collection_name": None,
        "views_count": 0
    }
    MOCK_STORIES.insert(0, new_story)
    return new_story
