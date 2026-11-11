import os

# Must be set before the app is imported so the engine binds to a throwaway database.
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-at-least-32-bytes-long"

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: E402,F401
from app.db.base import Base  # noqa: E402
from app.db.seed import seed_demo_data  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture
async def session_factory():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seeded(session_factory):
    async with session_factory() as s:
        await seed_demo_data(s)


SIGNUP = {
    "username": "New_User1",
    "password": "s3cretpass",
    "works": True,
    "profession": {"industry": "Technology & Engineering", "title": "Backend Developer", "years_of_experience": 4},
    "interests": ["Technology & Engineering", "Science & Research"],
    "gender": "female",
    "age": 29,
    "country": "Israel",
    "education_level": "bachelors",
    "data_consent": True,
}


@pytest.fixture
def signup_payload():
    return {**SIGNUP, "profession": dict(SIGNUP["profession"]), "interests": list(SIGNUP["interests"])}


@pytest_asyncio.fixture
async def auth_headers(client, signup_payload):
    r = await client.post("/api/v1/auth/register", json=signup_payload)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
