from fastapi import APIRouter
from app.api.v1.endpoints import auth, stories, posts, discovery

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Profiles"])
api_router.include_router(stories.router, prefix="/stories", tags=["Stories & Highlights"])
api_router.include_router(posts.router, prefix="/posts", tags=["Posts & Task Walkthroughs"])
api_router.include_router(discovery.router, prefix="/discovery", tags=["Profession Discovery"])
