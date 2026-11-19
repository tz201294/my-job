"""Photo uploads: checking, cleaning and storing images.

Every upload is opened and re-encoded with Pillow, never stored as sent:
- only real JPEG, PNG, WebP and GIF images are accepted (whatever the file name or type claims),
- phone photos are turned the right way up, then shrunk to at most 1600 px (profile photos 512 px),
- everything hidden in the file (EXIF data such as the GPS location where a photo was taken, camera details,
  embedded thumbnails) is dropped, because only the pixels are written back out, as WebP.

Storage:
- Cloudinary (CLOUDINARY_URL set): the photo goes to Cloudinary, which serves it from its CDN. Needed in
  production: Render's free plan has no lasting disk.
- Otherwise, outside production: files go to MEDIA_DIR and the API serves them at /media/ (local development).
- Production without Cloudinary: uploads are refused (503) with a clear message; links still work.

Cleanup: when a post, story, profile photo or account is removed (or a photo is replaced), `forget_images`
deletes the stored files that nothing uses any more. Only photos stored by this app are touched (our Cloudinary
folder or MEDIA_DIR), never pasted links to other sites; a file still used by another post, story or profile is
kept. Deleting is best effort, after the response: a failure is logged and never undoes the user's action.
"""
import hashlib
import io
import logging
import re
import secrets
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional, Set
from urllib.parse import urlparse

import httpx
from fastapi import BackgroundTasks, HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import String, cast, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Post, Story, TaskDetails, User

logger = logging.getLogger(__name__)

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}
MAX_PIXELS = 40_000_000  # refuse "decompression bombs": tiny files that expand into enormous images
MAX_SIDE = {"avatar": 512, "post": 1600, "story": 1600, "step": 1600}
QUALITY = 82


@dataclass
class StoredImage:
    url: str
    width: int
    height: int


def uploads_available() -> bool:
    return bool(settings.CLOUDINARY_URL) or not settings.is_production


def clean_image(data: bytes, purpose: str) -> tuple[bytes, int, int]:
    """Validates and re-encodes an uploaded image. Returns (webp bytes, width, height)."""
    try:
        with Image.open(io.BytesIO(data)) as probe:
            fmt = probe.format
            w, h = probe.size
            probe.verify()  # catches truncated or corrupt files
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise HTTPException(status_code=415, detail="That file isn't a photo we can read. Use a JPEG, PNG, WebP or GIF image.")
    if fmt not in ALLOWED_FORMATS:
        raise HTTPException(status_code=415, detail="That photo format isn't supported. Use a JPEG, PNG, WebP or GIF image.")
    if w * h > MAX_PIXELS:
        raise HTTPException(status_code=413, detail="That photo is too large (too many pixels).")

    try:
        with Image.open(io.BytesIO(data)) as img:
            img.seek(0)  # animated GIFs: the first frame
            img = ImageOps.exif_transpose(img)  # phones store rotation in EXIF; apply it before dropping EXIF
            has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
            img = img.convert("RGBA" if has_alpha else "RGB")
            img.thumbnail((MAX_SIDE[purpose], MAX_SIDE[purpose]), Image.LANCZOS)
            out = io.BytesIO()
            # A fresh image object written with no `exif`/`icc_profile`/`xmp` arguments: no metadata is carried over.
            img.save(out, format="WEBP", quality=QUALITY, method=4)
            return out.getvalue(), img.width, img.height
    except (OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(status_code=415, detail="That file isn't a photo we can read. Use a JPEG, PNG, WebP or GIF image.")


def _name() -> str:
    return secrets.token_urlsafe(16)


def _parse_cloudinary_url(url: str) -> tuple[str, str, str]:
    """cloudinary://<api_key>:<api_secret>@<cloud_name> -> (cloud_name, key, secret)."""
    rest = url.split("://", 1)[1]
    creds, cloud = rest.rsplit("@", 1)
    key, secret = creds.split(":", 1)
    return cloud.strip("/"), key, secret


def cloudinary_signature(params: dict, secret: str) -> str:
    """Cloudinary's signed-upload signature: SHA-1 of the sorted parameters followed by the API secret."""
    to_sign = "&".join(f"{k}={params[k]}" for k in sorted(params))
    return hashlib.sha1((to_sign + secret).encode("utf-8")).hexdigest()


async def _store_cloudinary(data: bytes, purpose: str) -> str:
    cloud, key, secret = _parse_cloudinary_url(settings.CLOUDINARY_URL)
    params = {"folder": f"prologue/{purpose}", "public_id": _name(), "timestamp": str(int(time.time()))}
    form = {**params, "api_key": key, "signature": cloudinary_signature(params, secret)}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"https://api.cloudinary.com/v1_1/{cloud}/image/upload", data=form,
                                  files={"file": ("photo.webp", data, "image/webp")})
    except httpx.HTTPError as e:
        logger.error("Could not reach Cloudinary: %s", e)
        raise HTTPException(status_code=502, detail="The photo couldn't be saved. Please try again.")
    if r.status_code >= 300:
        logger.error("Cloudinary refused an upload (%s): %s", r.status_code, r.text[:500])
        raise HTTPException(status_code=502, detail="The photo couldn't be saved. Please try again.")
    return r.json()["secure_url"]


def _store_local(data: bytes, base_url: str) -> str:
    folder = Path(settings.MEDIA_DIR)
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{_name()}.webp"
    (folder / name).write_bytes(data)
    return f"{base_url.rstrip('/')}/media/{name}"


async def store_image(data: bytes, purpose: str, base_url: str) -> StoredImage:
    if not uploads_available():
        raise HTTPException(status_code=503, detail="Photo uploads aren't set up on this server yet. Paste a link to an image instead.")
    cleaned, width, height = clean_image(data, purpose)
    if settings.CLOUDINARY_URL:
        url = await _store_cloudinary(cleaned, purpose)
    else:
        url = _store_local(cleaned, base_url)
    return StoredImage(url=url, width=width, height=height)


# ---------- removing photos nobody uses any more ----------

_LOCAL_NAME = re.compile(r"^[A-Za-z0-9_-]{8,64}\.webp$")


def cloudinary_public_id(url: str) -> Optional[str]:
    """The Cloudinary id of a photo this app uploaded ("prologue/post/<name>"), or None for anything else."""
    if not settings.CLOUDINARY_URL or not url:
        return None
    cloud = _parse_cloudinary_url(settings.CLOUDINARY_URL)[0]
    prefix = f"https://res.cloudinary.com/{cloud}/image/upload/"
    if not url.startswith(prefix):
        return None
    path = re.sub(r"^v\d+/", "", url[len(prefix):].split("?", 1)[0])
    if not path.startswith("prologue/") or ".." in path:
        return None
    return path.rsplit(".", 1)[0]


def _local_file(url: str) -> Optional[Path]:
    """The file in MEDIA_DIR behind a /media/<name>.webp address, or None."""
    path = urlparse(url or "").path
    if not path.startswith("/media/"):
        return None
    name = path[len("/media/"):]
    if not _LOCAL_NAME.match(name):
        return None
    f = Path(settings.MEDIA_DIR) / name
    return f if f.is_file() else None


def _ours(url: str) -> bool:
    return bool(cloudinary_public_id(url) or _local_file(url))


async def _still_used(db: AsyncSession, url: str) -> bool:
    checks = (
        select(Post.id).where(cast(Post.media, String).contains(url, autoescape=True)),
        select(TaskDetails.id).where(cast(TaskDetails.steps, String).contains(url, autoescape=True)),
        select(Story.id).where(Story.media_url == url),
        select(User.id).where(User.avatar_url == url),
    )
    for stmt in checks:
        if (await db.execute(stmt.limit(1))).first() is not None:
            return True
    return False


async def post_image_urls(db: AsyncSession, post_ids) -> Set[str]:
    """Every photo address on these posts: covers and step images. `post_ids` is a list or a SELECT of ids."""
    urls: Set[str] = set()
    for media in (await db.execute(select(Post.media).where(Post.id.in_(post_ids)))).scalars():
        urls.update(m["url"] for m in media or [] if isinstance(m, dict) and m.get("url"))
    for steps in (await db.execute(select(TaskDetails.steps).where(TaskDetails.post_id.in_(post_ids)))).scalars():
        urls.update(s["image_url"] for s in steps or [] if isinstance(s, dict) and s.get("image_url"))
    return urls


async def user_image_urls(db: AsyncSession, user_id: str) -> Set[str]:
    """Every photo of one account: its posts, stories and profile photo."""
    urls = await post_image_urls(db, select(Post.id).where(Post.author_id == user_id))
    urls.update((await db.execute(select(Story.media_url).where(Story.user_id == user_id))).scalars())
    avatar = (await db.execute(select(User.avatar_url).where(User.id == user_id))).scalar_one_or_none()
    if avatar:
        urls.add(avatar)
    return urls


async def _delete_cloudinary(public_id: str) -> None:
    cloud, key, secret = _parse_cloudinary_url(settings.CLOUDINARY_URL)
    params = {"public_id": public_id, "timestamp": str(int(time.time()))}
    form = {**params, "api_key": key, "signature": cloudinary_signature(params, secret)}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"https://api.cloudinary.com/v1_1/{cloud}/image/destroy", data=form)
    if r.status_code >= 300 or r.json().get("result") not in ("ok", "not found"):
        raise RuntimeError(f"Cloudinary answered {r.status_code}: {r.text[:300]}")


async def delete_stored_images(urls: Iterable[str]) -> None:
    """Deletes the files behind these addresses (already checked to be ours and unused). Never raises."""
    for url in urls:
        try:
            public_id = cloudinary_public_id(url)
            if public_id:
                await _delete_cloudinary(public_id)
            else:
                f = _local_file(url)
                if f:
                    f.unlink(missing_ok=True)
        except Exception as e:  # noqa: BLE001 - cleanup must never break anything
            logger.warning("Could not delete the stored photo %s: %s", url, e)


async def forget_images(db: AsyncSession, background: BackgroundTasks, urls: Iterable[str]) -> None:
    """After a commit: schedule deleting the photos among `urls` that this app stored and nothing uses now."""
    unused = [u for u in set(urls) if u and _ours(u) and not await _still_used(db, u)]
    if unused:
        background.add_task(delete_stored_images, unused)
