from sqlalchemy import func, select

from app.models import CommentReaction, Notification

API = "/api/v1"


async def _h(client, username, password="demo1234"):
    r = await client.post(f"{API}/auth/login", json={"username_or_email": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _list(client, headers, **params):
    r = await client.get(f"{API}/notifications", params=params, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


async def _read_all(client, headers):
    await client.post(f"{API}/notifications/read", json={}, headers=headers)


async def _post_by(client, username):
    return next(p for p in (await client.get(f"{API}/posts/feed")).json() if p["author_username"] == username)


# ---------- basics ----------

async def test_requires_login(client):
    assert (await client.get(f"{API}/notifications")).status_code == 401
    assert (await client.get(f"{API}/notifications/unread-count")).status_code == 401


async def test_seed_creates_unread_notifications(client, seeded):
    sarah = await _h(client, "sarah_plumber")
    page = await _list(client, sarah)
    types = {n["type"] for n in page["notifications"]}
    assert {"follow", "comment", "question", "suggestion"} <= types
    assert page["unread_count"] == page["total"] > 0
    assert all(n["read"] is False for n in page["notifications"])
    # Newest first
    stamps = [n["created_at"] for n in page["notifications"]]
    assert stamps == sorted(stamps, reverse=True)
    alex = await _h(client, "alex_driver")
    assert "accepted" in {n["type"] for n in (await _list(client, alex))["notifications"]}


async def test_mark_read_some_or_all(client, seeded):
    sarah = await _h(client, "sarah_plumber")
    page = await _list(client, sarah)
    first = page["notifications"][0]["id"]
    r = await client.post(f"{API}/notifications/read", json={"ids": [first]}, headers=sarah)
    assert r.json()["unread_count"] == page["unread_count"] - 1
    assert (await client.get(f"{API}/notifications/unread-count", headers=sarah)).json()["unread_count"] == page["unread_count"] - 1
    # Someone else's ids are ignored
    alex = await _h(client, "alex_driver")
    alex_before = (await _list(client, alex))["unread_count"]
    await client.post(f"{API}/notifications/read", json={"ids": [n["id"] for n in page["notifications"]]}, headers=alex)
    assert (await _list(client, alex))["unread_count"] == alex_before
    await _read_all(client, sarah)
    page = await _list(client, sarah)
    assert page["unread_count"] == 0 and all(n["read"] for n in page["notifications"])


async def test_pagination(client, seeded):
    sarah = await _h(client, "sarah_plumber")
    total = (await _list(client, sarah))["total"]
    p1 = await _list(client, sarah, limit=2, offset=0)
    p2 = await _list(client, sarah, limit=2, offset=2)
    assert len(p1["notifications"]) == 2 and p1["total"] == total
    assert not {n["id"] for n in p1["notifications"]} & {n["id"] for n in p2["notifications"]}


# ---------- each event ----------

async def test_events_notify_the_right_person(client, seeded, auth_headers):
    me = auth_headers  # new_user1
    sarah = await _h(client, "sarah_plumber")
    elena = await _h(client, "elena_lawyer")
    for h in (sarah, elena):
        await _read_all(client, h)

    # follow -> sarah
    await client.post(f"{API}/auth/users/sarah_plumber/follow", headers=me)
    # comment -> sarah
    sarah_post = await _post_by(client, "sarah_plumber")
    comment = (await client.post(f"{API}/posts/{sarah_post['id']}/comments", json={"body": "Great job!"},
                                 headers=me)).json()
    # review -> sarah
    await client.post(f"{API}/community/reviews", json={"post_id": sarah_post["id"], "clarity_score": 5,
                                                        "accuracy_score": 4, "feedback_text": "Clear"}, headers=me)
    # question -> elena, then elena answers -> me
    elena_id = (await client.get(f"{API}/auth/users/elena_lawyer")).json()["id"]
    q = (await client.post(f"{API}/community/qa/{elena_id}/ask", json={"question_text": "How long is law school?"},
                           headers=me)).json()
    await client.post(f"{API}/community/qa/questions/{q['id']}/answer", json={"answer_text": "Three years."}, headers=elena)
    # suggestion on elena's challenge -> elena, she accepts -> me
    chal = next(c for c in (await client.get(f"{API}/community/challenges")).json() if c["worker_username"] == "elena_lawyer")
    sug = (await client.post(f"{API}/community/challenges/{chal['id']}/suggest", json={"suggestion_text": "File it."},
                             headers=me)).json()
    await client.post(f"{API}/community/suggestions/{sug['id']}/accept", headers=elena)
    # sarah reacts to my comment -> me
    await client.put(f"{API}/posts/{sarah_post['id']}/comments/{comment['id']}/reaction", json={"emoji": "❤️"},
                     headers=sarah)

    s = {n["type"]: n for n in (await _list(client, sarah))["notifications"] if not n["read"]}
    assert set(s) == {"follow", "comment", "review"}
    assert s["comment"]["post_id"] == sarah_post["id"] and s["comment"]["comment_id"] == comment["id"]
    assert s["comment"]["snippet"] == "Great job!" and s["comment"]["actor_username"] == "new_user1"
    assert s["review"]["snippet"].startswith("4.5")

    e = {n["type"]: n for n in (await _list(client, elena))["notifications"] if not n["read"]}
    assert set(e) == {"question", "suggestion"}
    assert e["question"]["question_id"] == q["id"] and e["suggestion"]["challenge_id"] == chal["id"]

    m = {n["type"]: n for n in (await _list(client, me))["notifications"]}
    assert set(m) == {"answer", "accepted", "reaction"}
    assert m["answer"]["snippet"] == "Three years." and m["accepted"]["suggestion_id"] == sug["id"]
    assert m["reaction"]["snippet"].startswith("❤️") and m["reaction"]["actor_username"] == "sarah_plumber"


async def test_no_notifications_for_your_own_actions(client, seeded):
    sarah = await _h(client, "sarah_plumber")
    await _read_all(client, sarah)
    post = await _post_by(client, "sarah_plumber")
    c = (await client.post(f"{API}/posts/{post['id']}/comments", json={"body": "self"}, headers=sarah)).json()
    await client.put(f"{API}/posts/{post['id']}/comments/{c['id']}/reaction", json={"emoji": "👍"}, headers=sarah)
    chal = next(x for x in (await client.get(f"{API}/community/challenges")).json() if x["worker_username"] == "sarah_plumber")
    await client.post(f"{API}/community/challenges/{chal['id']}/suggest", json={"suggestion_text": "me"}, headers=sarah)
    assert (await _list(client, sarah))["unread_count"] == 0


async def test_repeats_collapse_and_edits_dont_notify(client, seeded, auth_headers):
    sarah = await _h(client, "sarah_plumber")
    await _read_all(client, sarah)
    for _ in range(3):
        await client.post(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)
        await client.delete(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)
    await client.post(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)
    assert [n["type"] for n in (await _list(client, sarah))["notifications"] if not n["read"]] == ["follow"]

    # Editing an answer doesn't notify again
    elena = await _h(client, "elena_lawyer")
    elena_id = (await client.get(f"{API}/auth/users/elena_lawyer")).json()["id"]
    q = (await client.post(f"{API}/community/qa/{elena_id}/ask", json={"question_text": "?"}, headers=auth_headers)).json()
    for text in ("one", "two"):
        await client.post(f"{API}/community/qa/questions/{q['id']}/answer", json={"answer_text": text}, headers=elena)
    assert [n["type"] for n in (await _list(client, auth_headers))["notifications"]] == ["answer"]


# ---------- reactions ----------

async def test_reactions_set_replace_remove(client, seeded, session_factory, auth_headers):
    post = await _post_by(client, "elena_lawyer")
    comments = (await client.get(f"{API}/posts/{post['id']}/comments")).json()["comments"]
    cid = comments[0]["id"]
    url = f"{API}/posts/{post['id']}/comments/{cid}/reaction"
    sarah = await _h(client, "sarah_plumber")

    assert (await client.put(url, json={"emoji": "❤️"})).status_code == 401
    assert (await client.put(url, json={"emoji": "🍕"}, headers=auth_headers)).status_code == 422
    assert (await client.put(f"{API}/posts/{post['id']}/comments/nope/reaction", json={"emoji": "❤️"},
                             headers=auth_headers)).status_code == 404

    r = (await client.put(url, json={"emoji": "❤️"}, headers=auth_headers)).json()
    assert r == {"comment_id": cid, "reactions": {"❤️": 1}, "my_reaction": "❤️"}
    r = (await client.put(url, json={"emoji": "❤️"}, headers=sarah)).json()
    assert r["reactions"] == {"❤️": 2}
    r = (await client.put(url, json={"emoji": "😂"}, headers=auth_headers)).json()  # replaces
    assert r["reactions"] == {"❤️": 1, "😂": 1} and r["my_reaction"] == "😂"

    listed = (await client.get(f"{API}/posts/{post['id']}/comments", headers=auth_headers)).json()["comments"]
    mine = next(c for c in listed if c["id"] == cid)
    assert mine["reactions"] == {"❤️": 1, "😂": 1} and mine["my_reaction"] == "😂"
    anon = next(c for c in (await client.get(f"{API}/posts/{post['id']}/comments")).json()["comments"] if c["id"] == cid)
    assert anon["my_reaction"] is None and anon["reactions"] == {"❤️": 1, "😂": 1}

    r = (await client.delete(url, headers=auth_headers)).json()
    assert r["reactions"] == {"❤️": 1} and r["my_reaction"] is None
    assert (await client.delete(url, headers=auth_headers)).status_code == 200  # idempotent

    # The commenter got one (collapsed) reaction notification per person; mine was withdrawn with my reaction.
    me_id = (await client.get(f"{API}/auth/me", headers=auth_headers)).json()["id"]
    sarah_id = (await client.get(f"{API}/auth/users/sarah_plumber")).json()["id"]

    async def reaction_notes(actor_id):
        async with session_factory() as s:
            return (await s.execute(select(func.count()).select_from(Notification).where(
                Notification.type == "reaction", Notification.comment_id == cid, Notification.actor_id == actor_id,
            ))).scalar_one()

    assert await reaction_notes(me_id) == 0
    assert await reaction_notes(sarah_id) == 1


async def test_deleting_content_removes_its_notifications_and_reactions(client, seeded, session_factory, auth_headers):
    created = (await client.post(f"{API}/posts", json={"title": "T", "caption": "C"}, headers=auth_headers)).json()
    sarah = await _h(client, "sarah_plumber")
    c = (await client.post(f"{API}/posts/{created['id']}/comments", json={"body": "hi"}, headers=sarah)).json()
    await client.put(f"{API}/posts/{created['id']}/comments/{c['id']}/reaction", json={"emoji": "👏"}, headers=auth_headers)

    async with session_factory() as s:
        assert (await s.execute(select(func.count()).select_from(Notification)
                                .where(Notification.post_id == created["id"]))).scalar_one() == 2
    assert (await client.delete(f"{API}/posts/{created['id']}", headers=auth_headers)).status_code == 204
    async with session_factory() as s:
        assert (await s.execute(select(func.count()).select_from(Notification)
                                .where(Notification.post_id == created["id"]))).scalar_one() == 0
        assert (await s.execute(select(func.count()).select_from(CommentReaction)
                                .where(CommentReaction.comment_id == c["id"]))).scalar_one() == 0


async def test_deleting_an_account_removes_its_notifications(client, seeded, session_factory):
    sarah = await _h(client, "sarah_plumber")
    sarah_id = (await client.get(f"{API}/auth/users/sarah_plumber")).json()["id"]
    elena_post = await _post_by(client, "elena_lawyer")
    cid = (await client.get(f"{API}/posts/{elena_post['id']}/comments")).json()["comments"][0]["id"]
    await client.put(f"{API}/posts/{elena_post['id']}/comments/{cid}/reaction", json={"emoji": "💡"}, headers=sarah)
    assert (await client.post(f"{API}/auth/me/delete", json={"password": "demo1234"}, headers=sarah)).status_code == 204
    async with session_factory() as s:
        left = (await s.execute(select(func.count()).select_from(Notification).where(
            (Notification.user_id == sarah_id) | (Notification.actor_id == sarah_id)))).scalar_one()
        assert left == 0
        assert (await s.execute(select(func.count()).select_from(CommentReaction)
                                .where(CommentReaction.user_id == sarah_id))).scalar_one() == 0
    # Other users' lists still load (no dangling actors)
    elena = await _h(client, "elena_lawyer")
    assert (await client.get(f"{API}/notifications", headers=elena)).status_code == 200
