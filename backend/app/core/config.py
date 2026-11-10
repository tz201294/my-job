from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "MyJob API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "temporary-secret-key-change-in-production"
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

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
