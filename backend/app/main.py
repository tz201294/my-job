import logging
from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.i18n import pick_language, translate
from app.core.monitoring import init_error_reporting
from app.db.seed import seed_demo_data
from app.db.session import AsyncSessionLocal, get_db

# Before the app is created, so Sentry hooks into FastAPI from the start.
init_error_reporting()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Alembic (`alembic upgrade head`); this only optionally seeds demo data.
    if settings.SEED_DEMO_DATA:
        async with AsyncSessionLocal() as session:
            await seed_demo_data(session)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Prologue — an Instagram-style social platform for real professions, daily workflows, and job task solutions.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Setup CORS middleware. Auth uses a Bearer header (not cookies), so credentials are not needed.
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.middleware("http")
async def refuse_oversized_uploads(request: Request, call_next):
    """Turn away uploads that are too big before reading them (the endpoint checks again while reading)."""
    if request.url.path.startswith(f"{settings.API_V1_STR}/uploads/"):
        length = request.headers.get("content-length")
        # The file plus a little room for the form around it.
        if length and length.isdigit() and int(length) > settings.MAX_UPLOAD_MB * 1024 * 1024 + 64 * 1024:
            message = f"That photo is too big. The limit is {settings.MAX_UPLOAD_MB} MB."
            lang = pick_language(request.headers.get("accept-language"))
            return JSONResponse(status_code=413, content={"detail": translate(message, lang)})
    return await call_next(request)


@app.exception_handler(StarletteHTTPException)
async def translated_http_error(request: Request, exc: StarletteHTTPException):
    """Error messages in the reader's language (the app sends it as Accept-Language)."""
    lang = pick_language(request.headers.get("accept-language"))
    detail = translate(exc.detail, lang) if isinstance(exc.detail, str) else exc.detail
    return JSONResponse(status_code=exc.status_code, content={"detail": detail}, headers=getattr(exc, "headers", None))


app.include_router(api_router, prefix=settings.API_V1_STR)

# Local development without Cloudinary: uploaded photos are files in MEDIA_DIR, served from here.
if not settings.CLOUDINARY_URL and not settings.is_production:
    Path(settings.MEDIA_DIR).mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.MEDIA_DIR), name="media")


@app.get("/health", tags=["System"])
async def health_check():
    """Is the API up? Deliberately doesn't touch the database, so frequent uptime checks (and Render's own) don't
    keep the database awake and use up its free compute hours."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }


@app.get("/health/db", tags=["System"])
async def database_health_check(db: AsyncSession = Depends(get_db)):
    """Can the API reach the database? Answers 503 if not. Check this one rarely (about hourly): every call wakes
    the database up."""
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Database health check failed")
        return JSONResponse(status_code=503, content={"status": "unhealthy", "database": "unreachable"})
    return {"status": "healthy", "database": "ok"}
