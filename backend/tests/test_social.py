from tests.test_content import API, POST_BODY


async def _profile(client, username, headers=None):
    return (await client.get(f"{API}/auth/users/{username}", headers=headers or {})).json()


async def test_follow_unfollow_is_idempotent_and_counts_are_real(client, seeded, auth_headers):
    before = await _profile(client, "sarah_plumber", auth_headers)
    assert before["is_following"] is False
    base = before["followers_count"]

    r = await client.post(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == {"username": "sarah_plumber", "is_following": True, "followers_count": base + 1, "follow_requested": False}

    # Following twice does not double count.
    again = await client.post(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)
    assert again.json()["followers_count"] == base + 1

    after = await _profile(client, "sarah_plumber", auth_headers)
    assert after["is_following"] is True and after["followers_count"] == base + 1
    me = (await client.get(f"{API}/auth/me", headers=auth_headers)).json()
    assert me["following_count"] == 1

    # An anonymous viewer never sees is_following=true.
    assert (await _profile(client, "sarah_plumber"))["is_following"] is False

    off = await client.delete(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)
    assert off.json() == {"username": "sarah_plumber", "is_following": False, "followers_count": base, "follow_requested": False}
    assert (await client.delete(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)).status_code == 200


async def test_follow_guards(client, seeded, auth_headers):
    me = (await client.get(f"{API}/auth/me", headers=auth_headers)).json()
    assert (await client.post(f"{API}/auth/users/{me['username']}/follow", headers=auth_headers)).status_code == 400
    assert (await client.post(f"{API}/auth/users/nobody/follow", headers=auth_headers)).status_code == 404
    assert (await client.post(f"{API}/auth/users/sarah_plumber/follow")).status_code == 401
    assert (await client.delete(f"{API}/auth/users/sarah_plumber/follow")).status_code == 401


async def test_following_feed_only_shows_followed_and_own_posts(client, seeded, auth_headers):
    assert (await client.get(f"{API}/posts/feed", params={"following": True})).status_code == 401

    empty = (await client.get(f"{API}/posts/feed", params={"following": True}, headers=auth_headers)).json()
    assert empty == []

    await client.post(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)
    feed = (await client.get(f"{API}/posts/feed", params={"following": True}, headers=auth_headers)).json()
    assert feed and {p["author_username"] for p in feed} == {"sarah_plumber"}

    mine = (await client.post(f"{API}/posts", json=POST_BODY, headers=auth_headers)).json()
    feed = (await client.get(f"{API}/posts/feed", params={"following": True}, headers=auth_headers)).json()
    assert mine["id"] in {p["id"] for p in feed}


async def test_bookmark_toggle_and_list(client, seeded, auth_headers):
    post = (await client.get(f"{API}/posts/feed")).json()[0]
    pid = post["id"]

    assert (await client.post(f"{API}/posts/{pid}/bookmark")).status_code == 401
    assert (await client.post(f"{API}/posts/nope/bookmark", headers=auth_headers)).status_code == 404
    assert (await client.get(f"{API}/posts/bookmarks")).status_code == 401
    assert (await client.get(f"{API}/posts/bookmarks", headers=auth_headers)).json() == []

    on = await client.post(f"{API}/posts/{pid}/bookmark", headers=auth_headers)
    assert on.json() == {"post_id": pid, "is_bookmarked": True}

    saved = (await client.get(f"{API}/posts/bookmarks", headers=auth_headers)).json()
    assert [p["id"] for p in saved] == [pid] and saved[0]["is_bookmarked_by_me"] is True

    feed_mine = next(p for p in (await client.get(f"{API}/posts/feed", headers=auth_headers)).json() if p["id"] == pid)
    feed_anon = next(p for p in (await client.get(f"{API}/posts/feed")).json() if p["id"] == pid)
    assert feed_mine["is_bookmarked_by_me"] is True and feed_anon["is_bookmarked_by_me"] is False
    assert (await client.get(f"{API}/posts/{pid}", headers=auth_headers)).json()["is_bookmarked_by_me"] is True

    off = await client.post(f"{API}/posts/{pid}/bookmark", headers=auth_headers)
    assert off.json()["is_bookmarked"] is False
    assert (await client.get(f"{API}/posts/bookmarks", headers=auth_headers)).json() == []
