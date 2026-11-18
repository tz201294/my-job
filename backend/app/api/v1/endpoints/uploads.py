from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.api.deps import get_current_user
from app.api.rate_limits import limit
from app.core.config import settings
from app.models import User
from app.services.images import store_image, uploads_available

router = APIRouter()


@router.get("/status")
async def upload_status():
    """Whether this server accepts photo uploads (the app hides the Upload button if not)."""
    return {"images": uploads_available(), "max_mb": settings.MAX_UPLOAD_MB}


@router.post("/images", status_code=status.HTTP_201_CREATED, dependencies=[Depends(limit("upload"))])
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    purpose: Literal["post", "story", "step", "avatar"] = Form("post"),
    user: User = Depends(get_current_user),
):
    """Upload a photo. It's checked, turned the right way up, resized, stripped of hidden data (such as the GPS
    location) and stored; the answer is its address, to use as a post's cover, a step image, a story or a profile
    photo."""
    limit_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    data = await file.read(limit_bytes + 1)
    if len(data) > limit_bytes:
        raise HTTPException(status_code=413, detail=f"That photo is too big. The limit is {settings.MAX_UPLOAD_MB} MB.")
    if not data:
        raise HTTPException(status_code=400, detail="The file is empty.")
    stored = await store_image(data, purpose, str(request.base_url))
    return {"url": stored.url, "width": stored.width, "height": stored.height}
