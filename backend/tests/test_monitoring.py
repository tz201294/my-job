import pytest
import sentry_sdk
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import monitoring
from app.core.config import settings
from app.db.session import get_db
from app.main import app


def test_error_reporting_is_off_without_a_dsn(monkeypatch):
    monkeypatch.setattr(settings, "SENTRY_DSN", "")
    called = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kw: called.append(kw))
    assert monitoring.init_error_reporting() is False
    assert called == []


def test_error_reporting_sends_no_personal_data(monkeypatch):
    monkeypatch.setattr(settings, "SENTRY_DSN", "https://key@o0.ingest.sentry.io/1")
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc123")
    called = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kw: called.append(kw))
    assert monitoring.init_error_reporting() is True
    opts = called[0]
    assert not opts.get("send_default_pii")  # the default: no IPs, cookies or auth headers
    assert opts["max_request_body_size"] == "never"  # bodies hold passwords and posts
    assert opts["include_local_variables"] is False
    assert opts["release"] == "abc123"
    assert opts["traces_sample_rate"] == 0.0


async def test_unexpected_errors_reach_sentry_without_secrets():
    """A real Sentry client with a fake transport: a crash in an endpoint is captured, a 404 is not, and the
    captured event holds no request body, auth header or IP address."""
    sent = []
    # Built at run time: Sentry includes nearby source lines, so literals here would show up in the event.
    password, token = "hunter" + "22", "secret-" + "token"

    class Capture(sentry_sdk.transport.Transport):
        def capture_envelope(self, envelope):
            sent.extend(item.payload.json for item in envelope.items if item.payload.json)

    opts = {**monitoring.sentry_options(), "dsn": "https://key@o0.ingest.sentry.io/1", "transport": Capture}
    sentry_sdk.init(**opts)
    try:
        crashy = FastAPI()

        @crashy.post("/boom")
        async def boom():
            raise RuntimeError("kaboom")

        async with AsyncClient(transport=ASGITransport(app=crashy, raise_app_exceptions=False), base_url="http://t") as c:
            r = await c.post("/boom", json={"password": password}, headers={"Authorization": f"Bearer {token}"})
            assert r.status_code == 500
            assert (await c.get("/nope")).status_code == 404
        sentry_sdk.flush()
    finally:
        sentry_sdk.init(dsn=None)  # switch the client off again for the other tests

    events = [e for e in sent if e.get("exception")]
    assert len(events) == 1, sent
    assert events[0]["exception"]["values"][-1]["value"] == "kaboom"
    blob = str(events[0])
    for secret in (password, token):
        assert secret not in blob
    assert "ip_address" not in str(events[0].get("user", {}))


async def test_health_does_not_touch_the_database(client):
    r = await client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "healthy"


async def test_database_health(client):
    r = await client.get("/health/db")
    assert r.status_code == 200 and r.json() == {"status": "healthy", "database": "ok"}


async def test_database_health_reports_an_outage():
    class Broken(AsyncSession):
        async def execute(self, *a, **kw):
            raise ConnectionError("database is down")

    async def broken_db():
        yield Broken()

    app.dependency_overrides[get_db] = broken_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.get("/health/db")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 503 and r.json()["database"] == "unreachable"


@pytest.fixture(autouse=True)
def _no_sentry_leftovers():
    yield
    if sentry_sdk.get_client().is_active():
        sentry_sdk.init(dsn=None)
