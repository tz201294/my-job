from typing import List, Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Only acceptable in development/test. Production refuses to start with it (see _check_production).
DEV_SECRET_KEY = "development-only-secret-key-do-not-use-in-production"
MIN_SECRET_KEY_LENGTH = 32


def normalize_database_url(url: str) -> str:
    """Accepts the connection strings hosting providers hand out and converts them for SQLAlchemy + asyncpg.

    - postgres:// and postgresql:// become postgresql+asyncpg://
    - libpq's sslmode=... becomes asyncpg's ssl=... (asyncpg doesn't understand sslmode)
    - libpq-only options asyncpg would reject (e.g. channel_binding) are dropped
    Other URLs (sqlite+aiosqlite://, already-correct ones) are returned unchanged.
    """
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"
    if scheme != "postgresql+asyncpg":
        return url
    query = []
    for key, value in parse_qsl(parts.query, keep_blank_values=True):
        if key == "sslmode":
            # asyncpg accepts disable/allow/prefer/require/verify-ca/verify-full under the name "ssl"
            query.append(("ssl", value))
        elif key in ("channel_binding", "gssencmode", "target_session_attrs"):
            continue
        else:
            query.append((key, value))
    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

    PROJECT_NAME: str = "Prologue API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # "production" is the default so that a deployment which forgets to configure itself fails closed.
    # Local development, docker compose and the test suite set ENVIRONMENT=development.
    ENVIRONMENT: Literal["development", "production"] = "production"

    # Security
    SECRET_KEY: str = DEV_SECRET_KEY
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS: browser origins allowed to call the API. Override with a JSON list, e.g.
    # BACKEND_CORS_ORIGINS='["https://myjob.example.com"]'. "*" is refused in production.
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Login brute-force protection: failed attempts allowed per window before answering 429.
    # Counted in this process's memory, so each API worker keeps its own count.
    LOGIN_MAX_FAILURES_PER_USERNAME: int = 5
    LOGIN_MAX_FAILURES_PER_IP: int = 20
    LOGIN_FAILURE_WINDOW_SECONDS: int = 15 * 60

    # Where the website lives, for links in emails (no trailing slash), e.g. https://tz201294.github.io/my-job
    FRONTEND_URL: str = "http://localhost:3000"

    # Sending email through Brevo's API (docs/DEPLOY.md step 5). Without BREVO_API_KEY nothing is sent: emails are
    # written to the log instead, which is what you want locally.
    BREVO_API_KEY: str = ""
    EMAIL_FROM: str = ""  # a sender address verified in Brevo
    EMAIL_FROM_NAME: str = "Prologue"
    PASSWORD_RESET_LINK_MINUTES: int = 60
    EMAIL_VERIFY_LINK_DAYS: int = 7

    # Moderators: these usernames see the Moderation page (reports, suspending accounts). Set as a JSON list,
    # e.g. ADMIN_USERNAMES='["tz201294"]'. Usernames are stored lower-case.
    ADMIN_USERNAMES: List[str] = []

    # Spam limits on sign-ups, posts, comments, reactions etc. (see app/api/rate_limits.py).
    RATE_LIMITS_ENABLED: bool = True

    # Database & Cache Defaults
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/myjob_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Stories Expiration (in seconds)
    STORY_EXPIRATION_SECONDS: int = 86400  # 24 Hours

    # Development only: populate an empty database with demo users/content on startup.
    # Demo accounts all share DEMO_PASSWORD, so this is refused in production.
    SEED_DEMO_DATA: bool = False
    DEMO_PASSWORD: str = "demo1234"

    # Error reporting (see app/core/monitoring.py). Empty = off. The DSN comes from the Sentry project's settings.
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0

    @field_validator("ADMIN_USERNAMES")
    @classmethod
    def _lower_admins(cls, v: List[str]) -> List[str]:
        return [u.strip().lower() for u in v if u.strip()]

    @field_validator("FRONTEND_URL")
    @classmethod
    def _no_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        return normalize_database_url(v)

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @model_validator(mode="after")
    def _check_production(self):
        if not self.is_production:
            return self
        problems = []
        if self.SECRET_KEY == DEV_SECRET_KEY or len(self.SECRET_KEY) < MIN_SECRET_KEY_LENGTH:
            problems.append(
                f"SECRET_KEY must be set to a random value of at least {MIN_SECRET_KEY_LENGTH} characters "
                "(e.g. python -c \"import secrets; print(secrets.token_urlsafe(48))\")"
            )
        if self.SEED_DEMO_DATA:
            problems.append("SEED_DEMO_DATA must be false (demo accounts share a public password)")
        if not self.FRONTEND_URL.startswith("https://"):
            problems.append("FRONTEND_URL must be the website's https:// address (used in links in emails)")
        if self.BREVO_API_KEY and not self.EMAIL_FROM:
            problems.append("EMAIL_FROM must be set when BREVO_API_KEY is (the sender address verified in Brevo)")
        if "*" in self.BACKEND_CORS_ORIGINS:
            problems.append('BACKEND_CORS_ORIGINS must list real origins, not "*"')
        if problems:
            raise ValueError(
                "Unsafe production configuration (set ENVIRONMENT=development for local use):\n- "
                + "\n- ".join(problems)
            )
        return self


settings = Settings()
