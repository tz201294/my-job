API = "/api/v1"


async def _login(client, username, password="demo1234"):
    r = await client.post(f"{API}/auth/login", json={"username_or_email": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _go_private(client, headers, private=True):
    r = await client.patch(f"{API}/auth/me", headers=headers, json={"is_private": private})
    assert r.status_code == 200, r.text
    return r.json()


async def _my_post(client, headers):
    r = await client.post(f"{API}/posts", headers=headers, json={"title": "Night shift notes", "caption": "x"})
    assert r.status_code == 201
    return r.json()


def _feed_ids(r):
    return {p["id"] for p in r.json()}


async def test_accounts_are_public_by_default(client, auth_headers):
    me = (await client.get(f"{API}/auth/me", headers=auth_headers)).json()
    assert me["is_private"] is False


async def test_a_private_account_hides_its_posts_from_non_followers(client, seeded, auth_headers):
    post = await _my_post(client, auth_headers)
    await client.post(f"{API}/stories", headers=auth_headers, json={"media_url": "https://example.com/s.jpg", "caption": "hi"})
    assert (await _go_private(client, auth_headers))["is_private"] is True

    sarah = await _login(client, "sarah_plumber")
    assert post["id"] not in _feed_ids(await client.get(f"{API}/posts/feed", headers=sarah))
    assert post["id"] not in _feed_ids(await client.get(f"{API}/posts/feed"))  # nor to visitors
    r = await client.get(f"{API}/posts/{post['id']}", headers=sarah)
    assert r.status_code == 403 and r.json()["detail"] == "This account is private."
    assert (await client.get(f"{API}/posts/{post['id']}/comments", headers=sarah)).status_code == 403
    assert (await client.post(f"{API}/posts/{post['id']}/like", headers=sarah)).status_code == 403
    assert (await client.post(f"{API}/posts/{post['id']}/comments", headers=sarah, json={"body": "hi"})).status_code == 403
    stories = (await client.get(f"{API}/stories/feed", headers=sarah)).json()
    assert all(g["username"] != "new_user1" for g in stories)

    # The profile card itself stays visible, so people can ask to follow.
    profile = (await client.get(f"{API}/auth/users/new_user1", headers=sarah)).json()
    assert profile["is_private"] is True and profile["follow_requested"] is False
    # The owner still sees everything of their own.
    assert post["id"] in _feed_ids(await client.get(f"{API}/posts/feed", headers=auth_headers))
    assert (await client.get(f"{API}/posts/{post['id']}", headers=auth_headers)).status_code == 200


async def test_follow_requests_are_approved_by_the_owner(client, seeded, auth_headers):
    post = await _my_post(client, auth_headers)
    await _go_private(client, auth_headers)
    sarah = await _login(client, "sarah_plumber")

    r = await client.post(f"{API}/auth/users/new_user1/follow", headers=sarah)
    assert r.json()["is_following"] is False and r.json()["follow_requested"] is True
    assert (await client.get(f"{API}/auth/users/new_user1", headers=sarah)).json()["follow_requested"] is True
    notes = (await client.get(f"{API}/notifications", headers=auth_headers)).json()["notifications"]
    assert [n["type"] for n in notes if n["actor_username"] == "sarah_plumber"] == ["follow_request"]

    requests = (await client.get(f"{API}/auth/me/follow-requests", headers=auth_headers)).json()
    assert [q["username"] for q in requests] == ["sarah_plumber"]
    r = await client.post(f"{API}/auth/me/follow-requests/sarah_plumber/accept", headers=auth_headers)
    assert r.json() == {"username": "sarah_plumber", "accepted": True}

    # Now she's a follower: she sees the posts, was told, and the request is gone.
    assert post["id"] in _feed_ids(await client.get(f"{API}/posts/feed", headers=sarah))
    assert (await client.get(f"{API}/posts/{post['id']}", headers=sarah)).status_code == 200
    her_notes = (await client.get(f"{API}/notifications", headers=sarah)).json()["notifications"]
    assert any(n["type"] == "follow_accepted" and n["actor_username"] == "new_user1" for n in her_notes)
    assert (await client.get(f"{API}/auth/me/follow-requests", headers=auth_headers)).json() == []
    notes = (await client.get(f"{API}/notifications", headers=auth_headers)).json()["notifications"]
    assert not [n for n in notes if n["type"] == "follow_request"]
    assert (await client.post(f"{API}/auth/me/follow-requests/sarah_plumber/accept", headers=auth_headers)).status_code == 404


async def test_declining_and_cancelling(client, seeded, auth_headers):
    await _go_private(client, auth_headers)
    sarah = await _login(client, "sarah_plumber")
    alex = await _login(client, "alex_driver")
    await client.post(f"{API}/auth/users/new_user1/follow", headers=sarah)
    await client.post(f"{API}/auth/users/new_user1/follow", headers=alex)

    r = await client.post(f"{API}/auth/me/follow-requests/sarah_plumber/decline", headers=auth_headers)
    assert r.json()["accepted"] is False
    assert (await client.get(f"{API}/auth/users/new_user1", headers=sarah)).json()["follow_requested"] is False

    r = await client.delete(f"{API}/auth/users/new_user1/follow", headers=alex)  # Alex changes his mind
    assert r.json()["follow_requested"] is False
    assert (await client.get(f"{API}/auth/me/follow-requests", headers=auth_headers)).json() == []


async def test_going_public_lets_waiting_requests_in(client, seeded, auth_headers):
    await _go_private(client, auth_headers)
    sarah = await _login(client, "sarah_plumber")
    await client.post(f"{API}/auth/users/new_user1/follow", headers=sarah)
    await _go_private(client, auth_headers, private=False)
    profile = (await client.get(f"{API}/auth/users/new_user1", headers=sarah)).json()
    assert profile["is_following"] is True and profile["follow_requested"] is False and profile["is_private"] is False
    # Following a public account is instant again.
    alex = await _login(client, "alex_driver")
    assert (await client.post(f"{API}/auth/users/new_user1/follow", headers=alex)).json()["is_following"] is True


async def test_blocking_removes_follow_requests(client, seeded, auth_headers):
    await _go_private(client, auth_headers)
    sarah = await _login(client, "sarah_plumber")
    await client.post(f"{API}/auth/users/new_user1/follow", headers=sarah)
    await client.post(f"{API}/auth/users/sarah_plumber/block", headers=auth_headers)
    assert (await client.get(f"{API}/auth/me/follow-requests", headers=auth_headers)).json() == []
