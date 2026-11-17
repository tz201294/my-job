import os

# Must be set before the app is imported so the engine binds to a throwaway database.
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-at-least-32-bytes-long"

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import NullPool, StaticPool  # noqa: E402

import app.models  # noqa: E402,F401
from app.db.base import Base  # noqa: E402
from app.db.seed import seed_demo_data  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402


# By default every test gets a fresh in-memory SQLite database. Set TEST_DATABASE_URL to a throwaway Postgres
# database (CI does) to run the same tests against Postgres, which is what production uses. Its tables are
# dropped and recreated for every test, so never point it at a database whose data you want to keep.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


def _test_engine():
    if TEST_DATABASE_URL:
        from app.core.config import normalize_database_url

        return create_async_engine(normalize_database_url(TEST_DATABASE_URL), poolclass=NullPool)
    return create_async_engine(
        "sqlite+aiosqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )


@pytest_asyncio.fixture
async def session_factory():
    engine = _test_engine()
    async with engine.begin() as conn:
        if TEST_DATABASE_URL:
            await conn.run_sync(Base.metadata.drop_all)
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


@pytest.fixture(autouse=True)
def reset_login_limits():
    """Failed-login counters live in process memory; start every test with a clean slate."""
    from app.api.v1.endpoints.auth import ip_limiter, username_limiter

    username_limiter.clear()
    ip_limiter.clear()
    yield
    username_limiter.clear()
    ip_limiter.clear()
