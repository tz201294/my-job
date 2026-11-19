from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Postgres: a small, explicit pool. Render's free instance runs one API process and Neon's free plan allows a
# limited number of connections, so 5 steady + 5 extra under load is plenty. Connections are checked before use
# and renewed every 5 minutes, because Neon closes them when the database pauses after a quiet spell.
# (Neon's own connection pooler stays off: see docs/DEPLOY.md, step 1.)
_pool = (
    {"pool_size": 5, "max_overflow": 5, "pool_recycle": 300, "pool_timeout": 30}
    if settings.DATABASE_URL.startswith("postgresql")
    else {}
)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    **_pool,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
