from sqlalchemy import func, select

from app.models import Post, PostComment

API = "/api/v1"


async def _login(client, username):
    r = await client.post(f"{API}/auth/login", json={"username_or_email": username, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _post_by(client, username):
    posts = (await client.get(f"{API}/posts/feed")).json()
    return next(p for p in posts if p["author_username"] == username)


async def _stored_count(session_factory, post_id):
    async with session_factory() as s:
        rows = (await s.execute(select(func.count()).select_from(PostComment).where(PostComment.post_id == post_id))).scalar_one()
        stored = (await s.execute(select(Post.comments_count).where(Post.id == post_id))).scalar_one()
        return rows, stored


async def test_seeded_comments_match_counts(client, seeded, session_factory):
    for p in (await client.get(f"{API}/posts/feed")).json():
        page = (await client.get(f"{API}/posts/{p['id']}/comments")).json()
        assert page["total"] == p["comments_count"] == len(page["comments"])
        rows, stored = await _stored_count(session_factory, p["id"])
        assert rows == stored == p["comments_count"]
    elena_post = await _post_by(client, "elena_lawyer")
    comments = (await client.get(f"{API}/posts/{elena_post['id']}/comments")).json()["comments"]
    # Oldest first, with author details for display
    assert [c["username"] for c in comments] == ["law_student_sam", "sarah_plumber"]
    assert comments[1]["profession_title"] == "Master Plumber" and comments[1]["updated_at"] is None


async def test_add_list_and_paginate_comments(client, seeded, session_factory, auth_headers):
    post = await _post_by(client, "alex_driver")
    url = f"{API}/posts/{post['id']}/comments"
    assert (await client.post(url, json={"body": "Hi"})).status_code == 401

    r = await client.post(url, json={"body": "  Great breakdown!  "}, headers=auth_headers)
    assert r.status_code == 201, r.text
    c = r.json()
    assert c["body"] == "Great breakdown!" and c["username"] == "new_user1" and c["post_id"] == post["id"]

    for i in range(3):
        await client.post(url, json={"body": f"more {i}"}, headers=auth_headers)
    page = (await client.get(url, params={"limit": 2, "offset": 2})).json()
    assert page["total"] == post["comments_count"] + 4
    assert len(page["comments"]) == 2
    assert (await client.get(f"{API}/posts/{post['id']}")).json()["comments_count"] == page["total"]
    assert await _stored_count(session_factory, post["id"]) == (page["total"], page["total"])

    assert (await client.get(f"{API}/posts/nope/comments")).status_code == 404
    assert (await client.post(f"{API}/posts/nope/comments", json={"body": "x"}, headers=auth_headers)).status_code == 404


async def test_comment_validation(client, seeded, auth_headers):
    post = await _post_by(client, "alex_driver")
    url = f"{API}/posts/{post['id']}/comments"
    for bad in ({"body": "   "}, {"body": "x" * 2001}, {}):
        assert (await client.post(url, json=bad, headers=auth_headers)).status_code == 422, bad


async def test_only_author_edits_a_comment(client, seeded, auth_headers):
    post = await _post_by(client, "alex_driver")
    c = (await client.post(f"{API}/posts/{post['id']}/comments", json={"body": "Typo hre"}, headers=auth_headers)).json()
    url = f"{API}/posts/{post['id']}/comments/{c['id']}"

    r = await client.patch(url, json={"body": "Typo here"}, headers=auth_headers)
    assert r.status_code == 200 and r.json()["body"] == "Typo here" and r.json()["updated_at"]
    alex = await _login(client, "alex_driver")  # the post's author can't rewrite someone's comment
    assert (await client.patch(url, json={"body": "x"}, headers=alex)).status_code == 403
    assert (await client.patch(url, json={"body": " "}, headers=auth_headers)).status_code == 422
    # A comment id under the wrong post is not found
    other = await _post_by(client, "sarah_plumber")
    assert (await client.patch(f"{API}/posts/{other['id']}/comments/{c['id']}", json={"body": "x"},
                               headers=auth_headers)).status_code == 404


async def test_commenter_or_post_author_deletes(client, seeded, session_factory, auth_headers):
    post = await _post_by(client, "alex_driver")
    base = f"{API}/posts/{post['id']}/comments"
    sarah = await _login(client, "sarah_plumber")
    alex = await _login(client, "alex_driver")

    mine = (await client.post(base, json={"body": "mine"}, headers=auth_headers)).json()
    assert (await client.delete(f"{base}/{mine['id']}", headers=sarah)).status_code == 403
    assert (await client.delete(f"{base}/{mine['id']}", headers=auth_headers)).status_code == 204
    assert (await client.delete(f"{base}/{mine['id']}", headers=auth_headers)).status_code == 404

    spam = (await client.post(base, json={"body": "spam"}, headers=sarah)).json()
    assert (await client.delete(f"{base}/{spam['id']}", headers=alex)).status_code == 204  # post author moderates

    rows, stored = await _stored_count(session_factory, post["id"])
    assert rows == stored == post["comments_count"]


async def test_deleting_a_post_deletes_its_comments(client, seeded, session_factory, auth_headers):
    created = (await client.post(f"{API}/posts", json={"title": "T", "caption": "C"}, headers=auth_headers)).json()
    sarah = await _login(client, "sarah_plumber")
    await client.post(f"{API}/posts/{created['id']}/comments", json={"body": "nice"}, headers=sarah)
    assert (await client.delete(f"{API}/posts/{created['id']}", headers=auth_headers)).status_code == 204
    async with session_factory() as s:
        left = (await s.execute(
            select(func.count()).select_from(PostComment).where(PostComment.post_id == created["id"])
        )).scalar_one()
    assert left == 0
