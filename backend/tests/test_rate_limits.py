from fastapi.routing import APIRoute

from app.api import rate_limits
from app.core.config import settings
from app.core.rate_limit import ActionLimiter
from app.main import app

API = "/api/v1"


def _tighten(monkeypatch, name, *limits):
    monkeypatch.setitem(rate_limits.limiters, name, ActionLimiter(list(limits)))


def test_limits_apply_over_several_windows_at_once():
    now = [0.0]
    lim = ActionLimiter([(2, 60), (3, 3600)], clock=lambda: now[0])
    for _ in range(2):
        assert lim.retry_after("u") is None
        lim.record("u")
    assert lim.retry_after("u") == 60  # 2 a minute
    assert lim.retry_after("someone else") is None
    now[0] = 61
    assert lim.retry_after("u") is None
    lim.record("u")
    assert lim.retry_after("u") == 3600 - 61  # 3 an hour


async def _first_post_id(client):
    return (await client.get(f"{API}/posts/feed")).json()[0]["id"]


async def test_commenting_too_fast_is_refused_with_a_clear_message(client, seeded, auth_headers, monkeypatch):
    _tighten(monkeypatch, "comment", (3, 60))
    pid = await _first_post_id(client)
    for i in range(3):
        r = await client.post(f"{API}/posts/{pid}/comments", headers=auth_headers, json={"body": f"hi {i}"})
        assert r.status_code == 201
    r = await client.post(f"{API}/posts/{pid}/comments", headers=auth_headers, json={"body": "one more"})
    assert r.status_code == 429
    assert 0 < int(r.headers["Retry-After"]) <= 60
    assert r.json()["detail"] == "You're commenting very fast. Please try again in 1 minute."

    # Someone else isn't affected.
    login = await client.post(f"{API}/auth/login", json={"username_or_email": "sarah_plumber", "password": "demo1234"})
    other = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert (await client.post(f"{API}/posts/{pid}/comments", headers=other, json={"body": "hello"})).status_code == 201


async def test_rejected_attempts_dont_count(client, seeded, auth_headers, monkeypatch):
    _tighten(monkeypatch, "comment", (2, 60))
    pid = await _first_post_id(client)
    for _ in range(5):
        r = await client.post(f"{API}/posts/{pid}/comments", headers=auth_headers, json={"body": ""})
        assert r.status_code == 422
    r = await client.post(f"{API}/posts/no-such-post/comments", headers=auth_headers, json={"body": "x"})
    assert r.status_code == 404
    for _ in range(2):
        assert (await client.post(f"{API}/posts/{pid}/comments", headers=auth_headers, json={"body": "ok"})).status_code == 201


async def test_signups_are_limited_per_network(client, signup_payload, monkeypatch):
    _tighten(monkeypatch, "signup", (2, 3600))
    assert (await client.post(f"{API}/auth/register", json={**signup_payload, "username": "person_0"})).status_code == 201
    # A taken name is refused, and doesn't count.
    assert (await client.post(f"{API}/auth/register", json={**signup_payload, "username": "person_0"})).status_code == 409
    assert (await client.post(f"{API}/auth/register", json={**signup_payload, "username": "person_1"})).status_code == 201
    r = await client.post(f"{API}/auth/register", json={**signup_payload, "username": "person_2"})
    assert r.status_code == 429
    assert r.json()["detail"] == "Too many new accounts from this network. Please try again in 1 hour."


async def test_posting_reacting_and_following_are_limited(client, seeded, auth_headers, monkeypatch):
    _tighten(monkeypatch, "post", (1, 3600))
    _tighten(monkeypatch, "reaction", (2, 60))
    post = {"title": "Hello", "caption": "First"}
    assert (await client.post(f"{API}/posts", headers=auth_headers, json=post)).status_code == 201
    assert (await client.post(f"{API}/posts", headers=auth_headers, json=post)).status_code == 429

    pid = await _first_post_id(client)
    assert (await client.post(f"{API}/posts/{pid}/like", headers=auth_headers)).status_code == 200
    assert (await client.post(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)).status_code == 200
    assert (await client.post(f"{API}/posts/{pid}/like", headers=auth_headers)).status_code == 429


async def test_limits_can_be_switched_off(client, seeded, auth_headers, monkeypatch):
    _tighten(monkeypatch, "comment", (1, 60))
    monkeypatch.setattr(settings, "RATE_LIMITS_ENABLED", False)
    pid = await _first_post_id(client)
    for _ in range(3):
        assert (await client.post(f"{API}/posts/{pid}/comments", headers=auth_headers, json={"body": "x"})).status_code == 201


# Writes that are deliberately not spam-limited: they create nothing others see (or have their own limit).
UNLIMITED_WRITES = {
    "login",  # failed-login limit
    "change_password",  # failed-password limit
    "delete_me",
    "mark_read",  # notifications
}


def _api_routes(routes):
    """Every APIRoute, also inside included routers (newer FastAPI versions keep those nested)."""
    for route in routes:
        if isinstance(route, APIRoute):
            yield route
        inner = getattr(route, "original_router", None) or getattr(route, "routes", None)
        if inner is not None:
            yield from _api_routes(getattr(inner, "routes", inner))


def _dependency_calls(dependant):
    for d in dependant.dependencies:
        yield d.call
        yield from _dependency_calls(d)


def test_every_write_route_has_a_spam_limit():
    """A new endpoint that creates or changes content must pick a limit (or be listed above on purpose)."""
    checked, missing = 0, []
    for route in _api_routes(app.routes):
        if not route.methods & {"POST", "PUT", "PATCH"} or route.endpoint.__name__ in UNLIMITED_WRITES:
            continue
        checked += 1
        names = {getattr(c, "__qualname__", "") for c in _dependency_calls(route.dependant)}
        if not any(n.startswith("limit.") or n == "limit_signups" for n in names):
            missing.append(f"{route.endpoint.__name__} ({route.path})")
    assert checked >= 20, f"only {checked} write routes found: is the route walk still working?"
    assert missing == [], f"write routes without a spam limit: {missing}"
