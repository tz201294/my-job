from datetime import timedelta
from types import SimpleNamespace

from sqlalchemy import select

from app.core.time import utcnow
from app.models import User
from app.models.activity import ViewEvent
from app.services.feed import Affinity, mix, rank

API = "/api/v1"


async def _login(client, username, password="demo1234"):
    r = await client.post(f"{API}/auth/login", json={"username_or_email": username, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _interested_in(client, headers, *slugs):
    r = await client.patch(f"{API}/auth/me", headers=headers, json={"interests": list(slugs)})
    assert r.status_code == 200, r.text


# ---- the ranking itself ----

def _item(name, owner, hours_old, pop=0):
    return SimpleNamespace(name=name, owner=owner, created=utcnow() - timedelta(hours=hours_old), pop=pop)


DOMAINS = {"plumber_1": ("plumber", "Trades & Craftsmanship"), "hvac_1": ("hvac-technician", "Trades & Craftsmanship"),
           "lawyer_1": ("lawyer", "Legal & Finance"), "nurse_1": ("nurse", "Healthcare & Medicine")}


def _rank(items, aff):
    return [i.name for i in rank(items, aff, domain_of=lambda o: DOMAINS.get(o, (None, None)), owner_of=lambda i: i.owner,
                                 created_of=lambda i: i.created, popularity_of=lambda i: i.pop, me="me", hours=36.0)]


def test_what_you_care_about_comes_before_what_is_merely_newer():
    aff = Affinity()
    aff.add("plumber", None, 3.0)
    items = [_item("lawyer_new", "lawyer_1", 1), _item("plumber_old", "plumber_1", 48), _item("hvac", "hvac_1", 30)]
    order = _rank(items, aff)
    assert order[0] == "plumber_old"  # the profession they picked
    assert order[1] == "hvac"  # same field: a little interest spills over
    assert order[2] == "lawyer_new"  # discovery fills in when nothing familiar is left


def test_engagement_shifts_the_feed():
    aff = Affinity()
    aff.add("plumber", None, 3.0)
    aff.add("lawyer", None, 6.0)  # e.g. they opened and saved a lot of legal case studies lately
    items = [_item("plumber", "plumber_1", 5), _item("lawyer", "lawyer_1", 5)]
    assert _rank(items, aff) == ["lawyer", "plumber"]


def test_about_one_in_five_is_discovery():
    assert mix(list("ABCDEFGH"), list("xyz")) == ["A", "B", "C", "D", "x", "E", "F", "G", "H", "y", "z"]
    assert mix([], list("xy")) == ["x", "y"]
    assert mix(list("AB"), []) == ["A", "B"]


def test_followed_accounts_count_as_familiar():
    aff = Affinity()
    aff.followed = {"nurse_1"}
    order = _rank([_item("nurse", "nurse_1", 10), _item("lawyer", "lawyer_1", 1)], aff)
    assert order == ["nurse", "lawyer"]


# ---- through the API ----

async def test_for_you_starts_from_the_chosen_interests(client, seeded, auth_headers):
    await _interested_in(client, auth_headers, "plumber")
    alex = await _login(client, "alex_driver")
    await client.post(f"{API}/posts", headers=alex, json={"title": "Brand new route notes", "caption": "x"})

    feed = (await client.get(f"{API}/posts/feed", headers=auth_headers)).json()
    assert feed[0]["author_username"] == "sarah_plumber"  # older, but a plumber
    assert any(p["title"] == "Brand new route notes" for p in feed)  # the rest is still there

    # Visitors (and the filtered feeds) stay newest first
    anon = (await client.get(f"{API}/posts/feed")).json()
    assert anon[0]["title"] == "Brand new route notes"
    times = [p["created_at"] for p in anon]
    assert times == sorted(times, reverse=True)
    # Paging walks through the same ranking
    first = (await client.get(f"{API}/posts/feed?limit=2", headers=auth_headers)).json()
    second = (await client.get(f"{API}/posts/feed?limit=2&offset=2", headers=auth_headers)).json()
    assert [p["id"] for p in first + second] == [p["id"] for p in feed[:4]]


async def test_amas_are_ranked_the_same_way(client, seeded, auth_headers):
    await _interested_in(client, auth_headers, "lawyer")
    qa = (await client.get(f"{API}/community/qa", headers=auth_headers)).json()
    assert qa[0]["worker_username"] == "elena_lawyer"
    await _interested_in(client, auth_headers, "plumber")
    qa = (await client.get(f"{API}/community/qa", headers=auth_headers)).json()
    assert qa[0]["worker_username"] == "sarah_plumber"


async def _my_views(session_factory):
    async with session_factory() as s:
        me = (await s.execute(select(User).where(User.username == "new_user1"))).scalar_one()
        return me.id, (await s.execute(select(ViewEvent).where(ViewEvent.user_id == me.id))).scalars().all()


async def test_opens_record_only_the_profession(client, seeded, auth_headers, session_factory):
    sarah_post = (await client.get(f"{API}/posts/feed?author_username=sarah_plumber")).json()[0]
    for body in ({"kind": "post", "id": sarah_post["id"]}, {"kind": "profile", "id": "elena_lawyer"},
                 {"kind": "profession", "id": "nurse"}, {"kind": "profession", "id": "astronaut"},
                 {"kind": "profile", "id": "nobody_here"}):
        assert (await client.post(f"{API}/activity/views", headers=auth_headers, json=body)).status_code == 204
    assert (await client.post(f"{API}/activity/views", json={"kind": "profession", "id": "nurse"})).status_code == 401
    assert (await client.post(f"{API}/activity/views", headers=auth_headers, json={"kind": "page", "id": "x"})).status_code == 422

    _, rows = await _my_views(session_factory)
    assert sorted((r.kind, r.slug) for r in rows) == [("post", "plumber"), ("profession", "nurse"), ("profile", "lawyer")]
    assert {r.field for r in rows} == {"Trades & Craftsmanship", "Legal & Finance", "Healthcare & Medicine"}

    export = (await client.get(f"{API}/auth/me/export", headers=auth_headers)).json()
    assert sorted(v["slug"] for v in export["opened_professions"]) == ["lawyer", "nurse", "plumber"]
    assert all("user_id" not in v and sarah_post["id"] not in str(v) for v in export["opened_professions"])


async def test_opens_are_deleted_with_the_account(client, seeded, auth_headers, session_factory, signup_payload):
    await client.post(f"{API}/activity/views", headers=auth_headers, json={"kind": "profession", "id": "nurse"})
    uid, rows = await _my_views(session_factory)
    assert len(rows) == 1
    r = await client.post(f"{API}/auth/me/delete", headers=auth_headers, json={"password": signup_payload["password"]})
    assert r.status_code == 204, r.text
    async with session_factory() as s:
        assert (await s.execute(select(ViewEvent).where(ViewEvent.user_id == uid))).first() is None
