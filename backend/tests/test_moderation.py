import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.models import Block, Report

API = "/api/v1"


@pytest.fixture(autouse=True)
def elena_moderates(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_USERNAMES", ["elena_lawyer"])


async def _login(client, username, password="demo1234"):
    r = await client.post(f"{API}/auth/login", json={"username_or_email": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _posts_by(client, username, headers=None):
    r = await client.get(f"{API}/posts/feed", params={"author_username": username}, headers=headers or {})
    return r.json()


async def _report(client, headers, target_type, target_id, reason="spam", details=None):
    return await client.post(f"{API}/moderation/reports", headers=headers, json={
        "target_type": target_type, "target_id": target_id, "reason": reason, "details": details,
    })


async def _count(session_factory, model, *where):
    async with session_factory() as s:
        return (await s.execute(select(func.count()).select_from(model).where(*where))).scalar_one()


# ---------- reporting ----------

async def test_reporting_a_post(client, seeded, auth_headers, session_factory):
    post = (await _posts_by(client, "sarah_plumber"))[0]
    r = await _report(client, auth_headers, "post", post["id"], "harassment", "Insulting people in the caption")
    assert r.status_code == 201 and "moderator" in r.json()["detail"]
    # Reporting again (by mistake) doesn't pile up.
    assert (await _report(client, auth_headers, "post", post["id"])).status_code == 201
    assert await _count(session_factory, Report) == 1

    sarah = await _login(client, "sarah_plumber")
    assert (await _report(client, sarah, "post", post["id"])).status_code == 400  # your own
    assert (await _report(client, auth_headers, "post", "no-such-post")).status_code == 404
    r = await client.post(f"{API}/moderation/reports", headers=auth_headers,
                          json={"target_type": "post", "target_id": post["id"], "reason": "because"})
    assert r.status_code == 422


async def test_only_moderators_see_reports(client, seeded, auth_headers):
    assert (await client.get(f"{API}/moderation/reports", headers=auth_headers)).status_code == 403
    me = (await client.get(f"{API}/auth/me", headers=auth_headers)).json()
    assert me["is_admin"] is False
    elena = await _login(client, "elena_lawyer")
    assert (await client.get(f"{API}/auth/me", headers=elena)).json()["is_admin"] is True
    assert (await client.get(f"{API}/moderation/reports", headers=elena)).json() == []


async def test_moderator_removes_reported_content(client, seeded, auth_headers):
    post = (await _posts_by(client, "sarah_plumber"))[0]
    alex = await _login(client, "alex_driver")
    await _report(client, auth_headers, "post", post["id"], "spam", "Advertising")
    await _report(client, alex, "post", post["id"], "spam")
    await _report(client, alex, "user", (await client.get(f"{API}/auth/users/sarah_plumber")).json()["id"], "other")

    elena = await _login(client, "elena_lawyer")
    queue = (await client.get(f"{API}/moderation/reports", headers=elena)).json()
    top = queue[0]  # the most reported first
    assert (top["target_type"], top["target_id"], top["reports_count"]) == ("post", post["id"], 2)
    assert top["reasons"] == {"spam": 2} and top["details"] == ["Advertising"]
    assert top["author"]["username"] == "sarah_plumber" and top["preview"]["title"] == post["title"]
    assert sorted(top["reporters"]) == ["alex_driver", "new_user1"]

    r = await client.post(f"{API}/moderation/reports/resolve", headers=elena,
                          json={"target_type": "post", "target_id": post["id"], "action": "remove"})
    assert r.json() == {"resolved": 2}
    assert (await client.get(f"{API}/posts/{post['id']}")).status_code == 404
    queue = (await client.get(f"{API}/moderation/reports", headers=elena)).json()
    assert [g["target_type"] for g in queue] == ["user"]  # the account report is still open
    removed = (await client.get(f"{API}/moderation/reports", params={"status": "removed"}, headers=elena)).json()
    assert removed[0]["exists"] is False

    r = await client.post(f"{API}/moderation/reports/resolve", headers=elena,
                          json={"target_type": "user", "target_id": queue[0]["target_id"], "action": "remove"})
    assert r.status_code == 400  # accounts are suspended, not removed
    r = await client.post(f"{API}/moderation/reports/resolve", headers=elena,
                          json={"target_type": "user", "target_id": queue[0]["target_id"], "action": "dismiss"})
    assert r.json() == {"resolved": 1}
    assert (await client.get(f"{API}/moderation/reports", headers=elena)).json() == []


async def test_suspending_an_account(client, seeded, auth_headers):
    alex_posts = await _posts_by(client, "alex_driver")
    assert alex_posts
    alex = await _login(client, "alex_driver")
    comment = (await client.post(f"{API}/posts/{(await _posts_by(client, 'sarah_plumber'))[0]['id']}/comments",
                                 headers=alex, json={"body": "rude words"})).json()
    await _report(client, auth_headers, "comment", comment["id"], "harassment")

    elena = await _login(client, "elena_lawyer")
    r = await client.post(f"{API}/moderation/reports/resolve", headers=elena,
                          json={"target_type": "comment", "target_id": comment["id"], "action": "suspend"})
    assert r.json() == {"resolved": 1}

    # Can't log in (told why, but only with the right password), and the old session stops working.
    r = await client.post(f"{API}/auth/login", json={"username_or_email": "alex_driver", "password": "demo1234"})
    assert r.status_code == 403 and "suspended" in r.json()["detail"]
    r = await client.post(f"{API}/auth/login", json={"username_or_email": "alex_driver", "password": "wrong-pass"})
    assert r.status_code == 401
    assert (await client.get(f"{API}/auth/me", headers=alex)).status_code == 401
    # Gone for everyone but moderators.
    assert await _posts_by(client, "alex_driver", auth_headers) == []
    assert (await client.get(f"{API}/posts/{alex_posts[0]['id']}")).status_code == 404
    assert (await client.get(f"{API}/auth/users/alex_driver", headers=auth_headers)).status_code == 404
    assert (await client.get(f"{API}/auth/users/alex_driver", headers=elena)).json()["is_active"] is False
    suspended = (await client.get(f"{API}/moderation/suspended", headers=elena)).json()
    assert [u["username"] for u in suspended] == ["alex_driver"]

    r = await client.post(f"{API}/moderation/users/alex_driver/unsuspend", headers=elena)
    assert r.json()["is_active"] is True
    assert len(await _posts_by(client, "alex_driver")) == len(alex_posts)
    await _login(client, "alex_driver")


async def test_moderators_cant_suspend_themselves_or_each_other(client, seeded):
    elena = await _login(client, "elena_lawyer")
    assert (await client.post(f"{API}/moderation/users/elena_lawyer/suspend", headers=elena)).status_code == 400
    assert (await client.post(f"{API}/moderation/users/nobody/suspend", headers=elena)).status_code == 404


async def test_non_moderators_cant_moderate(client, seeded, auth_headers):
    for method, url, body in (
        ("post", "/moderation/reports/resolve", {"target_type": "post", "target_id": "x", "action": "dismiss"}),
        ("post", "/moderation/users/sarah_plumber/suspend", None),
        ("post", "/moderation/users/sarah_plumber/unsuspend", None),
        ("get", "/moderation/suspended", None),
    ):
        r = await getattr(client, method)(f"{API}{url}", headers=auth_headers, **({"json": body} if body else {}))
        assert r.status_code == 403, url


# ---------- blocking ----------

async def test_blocking_hides_both_ways_and_stops_contact(client, seeded, auth_headers, session_factory):
    me = (await client.get(f"{API}/auth/me", headers=auth_headers)).json()
    sarah = await _login(client, "sarah_plumber")
    await client.post(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)
    await client.post(f"{API}/auth/users/new_user1/follow", headers=sarah)
    my_post = (await client.post(f"{API}/posts", headers=auth_headers, json={"title": "Mine", "caption": "x"})).json()

    r = await client.post(f"{API}/auth/users/sarah_plumber/block", headers=auth_headers)
    assert r.json() == {"username": "sarah_plumber", "is_blocked": True}
    # Follows are gone both ways, and so are notifications between them.
    profile = (await client.get(f"{API}/auth/users/sarah_plumber", headers=auth_headers)).json()
    assert profile["is_blocked"] is True and profile["is_following"] is False
    notes = (await client.get(f"{API}/notifications", headers=auth_headers)).json()
    assert not [n for n in notes["notifications"] if n["actor_username"] == "sarah_plumber"]

    # Neither sees the other's content.
    assert await _posts_by(client, "sarah_plumber", auth_headers) == []
    assert (await client.get(f"{API}/posts/{my_post['id']}", headers=sarah)).status_code == 404
    assert (await client.get(f"{API}/auth/users/new_user1", headers=sarah)).status_code == 404
    feed = (await client.get(f"{API}/posts/feed", headers=sarah)).json()
    assert my_post["id"] not in [p["id"] for p in feed]

    # And she can't reach me.
    assert (await client.post(f"{API}/posts/{my_post['id']}/comments", headers=sarah, json={"body": "hi"})).status_code == 403
    assert (await client.post(f"{API}/posts/{my_post['id']}/like", headers=sarah)).status_code == 403
    assert (await client.post(f"{API}/auth/users/new_user1/follow", headers=sarah)).status_code == 403
    r = await client.post(f"{API}/community/qa/{me['id']}/ask", headers=sarah, json={"question_text": "Hello there?"})
    assert r.status_code == 403

    blocked = (await client.get(f"{API}/auth/me/blocked", headers=auth_headers)).json()
    assert [b["username"] for b in blocked] == ["sarah_plumber"]

    assert (await client.delete(f"{API}/auth/users/sarah_plumber/block", headers=auth_headers)).json()["is_blocked"] is False
    assert await _posts_by(client, "sarah_plumber", auth_headers)
    assert (await client.post(f"{API}/auth/users/new_user1/follow", headers=sarah)).status_code == 200


async def test_blocked_peoples_comments_and_ideas_disappear(client, seeded, auth_headers):
    sarah = await _login(client, "sarah_plumber")
    elena_post = (await _posts_by(client, "elena_lawyer"))[0]
    await client.post(f"{API}/posts/{elena_post['id']}/comments", headers=sarah, json={"body": "sarah was here"})
    before = (await client.get(f"{API}/posts/{elena_post['id']}/comments", headers=auth_headers)).json()
    assert any(c["body"] == "sarah was here" for c in before["comments"])

    await client.post(f"{API}/auth/users/sarah_plumber/block", headers=auth_headers)
    after = (await client.get(f"{API}/posts/{elena_post['id']}/comments", headers=auth_headers)).json()
    assert not any(c["body"] == "sarah was here" for c in after["comments"])
    assert after["total"] == len([c for c in before["comments"] if c["username"] != "sarah_plumber"])
    # Everyone else still sees it.
    assert any(c["body"] == "sarah was here"
               for c in (await client.get(f"{API}/posts/{elena_post['id']}/comments")).json()["comments"])

    challenges = (await client.get(f"{API}/community/challenges", headers=auth_headers)).json()
    for ch in challenges:
        assert ch["worker_username"] != "sarah_plumber"
        assert all(s["suggester_username"] != "sarah_plumber" for s in ch["suggestions"])


async def test_cant_block_yourself(client, seeded, auth_headers):
    assert (await client.post(f"{API}/auth/users/new_user1/block", headers=auth_headers)).status_code == 400


async def test_deleting_an_account_removes_its_blocks_and_reports(client, seeded, auth_headers, signup_payload,
                                                                    session_factory):
    post = (await _posts_by(client, "sarah_plumber"))[0]
    await _report(client, auth_headers, "post", post["id"])
    await client.post(f"{API}/auth/users/sarah_plumber/block", headers=auth_headers)
    r = await client.post(f"{API}/auth/me/delete", headers=auth_headers, json={"password": signup_payload["password"]})
    assert r.status_code == 204
    assert await _count(session_factory, Report) == 0
    assert await _count(session_factory, Block) == 0
