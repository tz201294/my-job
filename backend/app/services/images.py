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
"""
import hashlib
import io
import logging
import secrets
import time
from dataclasses import dataclass
from pathlib import Path

import httpx
from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

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
