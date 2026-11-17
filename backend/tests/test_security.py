import pytest

from app.api.v1.endpoints import auth as auth_endpoints
from app.core.config import DEV_SECRET_KEY, Settings
from app.core.rate_limit import FailureLimiter

API = "/api/v1"
STRONG_KEY = "x" * 48


# ---------- production configuration ----------

@pytest.fixture(autouse=True)
def isolated_env(monkeypatch):
    """Settings read the process environment; the test suite itself sets SECRET_KEY there."""
    for name in ("ENVIRONMENT", "SECRET_KEY", "SEED_DEMO_DATA", "BACKEND_CORS_ORIGINS"):
        monkeypatch.delenv(name, raising=False)


def make_settings(**overrides):
    # _env_file=None so a developer's local .env cannot change the outcome.
    return Settings(_env_file=None, **overrides)


def test_production_accepts_a_safe_configuration():
    s = make_settings(ENVIRONMENT="production", SECRET_KEY=STRONG_KEY)
    assert s.is_production and "*" not in s.BACKEND_CORS_ORIGINS


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"SECRET_KEY": DEV_SECRET_KEY}, "SECRET_KEY"),
        ({"SECRET_KEY": "too-short"}, "SECRET_KEY"),
        ({"SECRET_KEY": STRONG_KEY, "SEED_DEMO_DATA": True}, "SEED_DEMO_DATA"),
        ({"SECRET_KEY": STRONG_KEY, "BACKEND_CORS_ORIGINS": ["*"]}, "BACKEND_CORS_ORIGINS"),
    ],
)
def test_production_refuses_unsafe_settings(overrides, message):
    with pytest.raises(ValueError, match=message):
        make_settings(ENVIRONMENT="production", **overrides)


def test_development_allows_local_defaults():
    s = make_settings(ENVIRONMENT="development", SEED_DEMO_DATA=True)
    assert s.SECRET_KEY == DEV_SECRET_KEY and not s.is_production


def test_production_is_the_default_environment():
    with pytest.raises(ValueError):
        make_settings()  # default SECRET_KEY + default ENVIRONMENT must not start


# ---------- failure limiter ----------

def test_failure_limiter_blocks_and_expires():
    now = [1000.0]
    lim = FailureLimiter(max_failures=3, window_seconds=60, clock=lambda: now[0])
    for _ in range(2):
        lim.record_failure("k")
        now[0] += 1
    assert lim.retry_after("k") is None
    lim.record_failure("k")  # third failure at t=1002; first was at t=1000
    assert lim.retry_after("k") == 58
    assert lim.retry_after("other") is None
    now[0] = 1060.5  # first failure has left the window
    assert lim.retry_after("k") is None
    lim.reset("k")
    assert lim.retry_after("k") is None


# ---------- login rate limiting ----------

async def _login(client, ident, password):
    return await client.post(f"{API}/auth/login", json={"username_or_email": ident, "password": password})


async def test_login_locks_a_username_after_repeated_failures(client, auth_headers):
    limit = auth_endpoints.username_limiter.max_failures
    for _ in range(limit):
        assert (await _login(client, "new_user1", "wrongpass1")).status_code == 401

    blocked = await _login(client, "NEW_USER1", "s3cretpass")  # even the right password, any casing
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0
    assert "Too many failed login attempts" in blocked.json()["detail"]


async def test_successful_login_resets_the_username_counter(client, auth_headers):
    limit = auth_endpoints.username_limiter.max_failures
    for _ in range(limit - 1):
        await _login(client, "new_user1", "wrongpass1")
    assert (await _login(client, "new_user1", "s3cretpass")).status_code == 200
    for _ in range(limit - 1):
        assert (await _login(client, "new_user1", "wrongpass1")).status_code == 401
    assert (await _login(client, "new_user1", "s3cretpass")).status_code == 200


async def test_login_locks_an_ip_guessing_across_usernames(client, monkeypatch):
    monkeypatch.setattr(auth_endpoints.ip_limiter, "max_failures", 3)
    for i in range(3):
        assert (await _login(client, f"ghost{i}", "whatever1")).status_code == 401
    assert (await _login(client, "someone_else", "whatever1")).status_code == 429


# ---------- media URLs ----------

POST = {"title": "T", "caption": "C", "post_type": "general_post"}


@pytest.mark.parametrize(
    "url", ["javascript:alert(1)", "data:image/png;base64,AAAA", "ftp://example.com/a.png", "not a url", "https://"]
)
async def test_post_media_must_be_an_http_link(client, auth_headers, url):
    r = await client.post(f"{API}/posts", json={**POST, "media": [{"url": url}]}, headers=auth_headers)
    assert r.status_code == 422, r.text


async def test_valid_links_are_accepted_and_blank_optional_links_are_dropped(client, auth_headers):
    body = {
        **POST,
        "post_type": "task_walkthrough",
        "media": [{"url": "  https://images.example.com/a.jpg  "}],
        "task_details": {
            "problem_statement": "p",
            "category": "Plumbing",
            "steps": [{"step_number": 1, "title": "s", "description": "d", "image_url": ""}],
        },
    }
    r = await client.post(f"{API}/posts", json=body, headers=auth_headers)
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["media"][0]["url"] == "https://images.example.com/a.jpg"
    assert created["task_details"]["steps"][0]["image_url"] is None


async def test_step_images_stories_and_challenges_reject_other_schemes(client, auth_headers):
    bad_step = {
        **POST,
        "task_details": {
            "problem_statement": "p",
            "category": "Plumbing",
            "steps": [{"step_number": 1, "title": "s", "description": "d", "image_url": "javascript:x"}],
        },
    }
    assert (await client.post(f"{API}/posts", json=bad_step, headers=auth_headers)).status_code == 422
    assert (
        await client.post(f"{API}/stories", json={"media_url": "data:text/html,hi"}, headers=auth_headers)
    ).status_code == 422
    assert (
        await client.post(f"{API}/stories", json={"media_url": "http://cdn.example.com/s.jpg"}, headers=auth_headers)
    ).status_code == 201
    challenge = {"title": "t", "scenario_description": "s", "profession_category": "Plumbing"}
    assert (
        await client.post(
            f"{API}/community/challenges", json={**challenge, "media_url": "vbscript:x"}, headers=auth_headers
        )
    ).status_code == 422
    assert (
        await client.post(f"{API}/community/challenges", json={**challenge, "media_url": ""}, headers=auth_headers)
    ).status_code == 201


# ---------- database URLs from hosting providers ----------

@pytest.mark.parametrize("given, expected", [
    ("postgres://u:p@host:5432/db", "postgresql+asyncpg://u:p@host:5432/db"),
    ("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
     "postgresql+asyncpg://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?ssl=require"),
    ("postgresql+asyncpg://u:p@h/db?ssl=require", "postgresql+asyncpg://u:p@h/db?ssl=require"),
    ("sqlite+aiosqlite:///./myjob.db", "sqlite+aiosqlite:///./myjob.db"),
])
def test_database_url_is_normalized(given, expected):
    assert make_settings(ENVIRONMENT="development", DATABASE_URL=given).DATABASE_URL == expected
