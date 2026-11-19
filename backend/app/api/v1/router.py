from fastapi import APIRouter
from app.api.v1.endpoints import (
    activity, auth, stories, posts, discovery, community, notifications, moderation, uploads, professions,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Profiles"])
api_router.include_router(stories.router, prefix="/stories", tags=["Stories & Highlights"])
api_router.include_router(posts.router, prefix="/posts", tags=["Posts & Task Walkthroughs"])
api_router.include_router(discovery.router, prefix="/discovery", tags=["Profession Discovery"])
api_router.include_router(community.router, prefix="/community", tags=["Community, Q&A, Ratings & Challenges"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(moderation.router, prefix="/moderation", tags=["Reports & Moderation"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["Photo uploads"])
api_router.include_router(professions.router, prefix="/professions", tags=["Profession catalog"])
api_router.include_router(activity.router, prefix="/activity", tags=["Feed personalization"])
