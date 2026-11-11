from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

    PROJECT_NAME: str = "MyJob API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "temporary-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "*"
    ]
    
    # Database & Cache Defaults
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/myjob_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Stories Expiration (in seconds)
    STORY_EXPIRATION_SECONDS: int = 86400  # 24 Hours

    # Development only: populate an empty database with demo users/content on startup.
    # Demo accounts all share DEMO_PASSWORD, so NEVER enable this in production.
    SEED_DEMO_DATA: bool = False
    DEMO_PASSWORD: str = "demo1234"


settings = Settings()
