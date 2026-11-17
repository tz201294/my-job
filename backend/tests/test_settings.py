from sqlalchemy import func, select

from app.models import (
    Bookmark, ChallengeSuggestion, Follow, Post, PostComment, PostLike, ProfessionProfile, QAQuestion, QAUpvote, Story,
    SuggestionUpvote, TaskReview, User, UserInterest, UserSurvey, WorkChallenge,
)

API = "/api/v1"


async def _login(client, username, password="demo1234"):
    return await client.post(f"{API}/auth/login", json={"username_or_email": username, "password": password})


async def _headers(client, username, password="demo1234"):
    r = await _login(client, username, password)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------- profile editing ----------

async def test_edit_basic_profile_fields(client, auth_headers):
    r = await client.patch(f"{API}/auth/me", json={
        "full_name": "  New Name ", "bio": " I fix servers. ", "avatar_url": "https://img.example.com/me.jpg",
        "email": "Me@Example.com", "interests": ["Healthcare & Medicine", "Healthcare & Medicine"],
    }, headers=auth_headers)
    assert r.status_code == 200, r.text
    me = r.json()
    assert me["full_name"] == "New Name" and me["bio"] == "I fix servers."
    assert me["avatar_url"] == "https://img.example.com/me.jpg" and me["email"] == "me@example.com"
    assert me["interests"] == ["Healthcare & Medicine"]
    assert me["profession"]["title"] == "Backend Developer"  # untouched

    # Clearing optional fields
    me = (await client.patch(f"{API}/auth/me", json={"bio": "", "avatar_url": "", "email": ""},
                             headers=auth_headers)).json()
    assert me["bio"] is None and me["avatar_url"] is None and me["email"] is None
    assert (await client.get(f"{API}/auth/me", headers=auth_headers)).json()["full_name"] == "New Name"


async def test_profile_validation(client, seeded, auth_headers):
    url = f"{API}/auth/me"
    for bad in (
        {"full_name": "  "}, {"full_name": None}, {"full_name": "x" * 129}, {"bio": "x" * 1001},
        {"avatar_url": "javascript:alert(1)"}, {"avatar_url": "https://x.com/" + "a" * 520},
        {"email": "not-an-email"}, {"interests": []}, {"interests": None}, {"interests": ["Astrology"]},
        {"works": True}, {"works": False, "profession": {"industry": "Other", "title": "Chef"}},
        {"profession": {"industry": "Made Up", "title": "Chef"}},
    ):
        assert (await client.patch(url, json=bad, headers=auth_headers)).status_code == 422, bad
    assert (await client.patch(url, json={"full_name": "x"})).status_code == 401

    # Someone else's email is taken (any casing)
    sarah_h = await _headers(client, "sarah_plumber")
    sarah_email = (await client.get(f"{API}/auth/me", headers=sarah_h)).json()["email"]
    assert sarah_email
    r = await client.patch(url, json={"email": sarah_email.upper()}, headers=auth_headers)
    assert r.status_code == 409
    # Keeping your own email is fine
    assert (await client.patch(url, json={"email": sarah_email}, headers=sarah_h)).status_code == 200


async def test_change_profession_and_work_status(client, seeded, session_factory, auth_headers):
    url = f"{API}/auth/me"
    me = (await client.patch(url, json={"profession": {
        "industry": "Healthcare & Medicine", "title": "ER Nurse", "years_of_experience": 6,
    }}, headers=auth_headers)).json()
    assert me["profession"]["title"] == "ER Nurse" and me["profession"]["years_of_experience"] == 6

    me = (await client.patch(url, json={"works": False}, headers=auth_headers)).json()
    assert me["profession"] is None
    me = (await client.patch(url, json={"works": True, "profession": {"industry": "Other", "title": "Baker"}},
                             headers=auth_headers)).json()
    assert me["profession"]["title"] == "Baker" and me["profession"]["is_verified_pro"] is False

    # A verified pro keeps the badge for small edits but loses it when the profession changes
    sarah = await _headers(client, "sarah_plumber")
    p = (await client.get(f"{API}/auth/me", headers=sarah)).json()["profession"]
    assert p["is_verified_pro"] is True
    same = {"industry": p["industry"], "title": p["title"], "years_of_experience": 20}
    assert (await client.patch(url, json={"profession": same}, headers=sarah)).json()["profession"]["is_verified_pro"]
    other = {**same, "title": "Pipefitter"}
    assert not (await client.patch(url, json={"profession": other}, headers=sarah)).json()["profession"]["is_verified_pro"]

    # Sign-up survey answers stay as given; only consent changes
    me = (await client.patch(url, json={"data_consent": False}, headers=auth_headers)).json()
    assert me["survey"]["data_consent"] is False and me["survey"]["works"] is True and me["survey"]["age"] == 29


# ---------- password ----------

async def test_change_password_signs_out_other_sessions(client, auth_headers, signup_payload):
    other_session = await _headers(client, "new_user1", signup_payload["password"])
    url = f"{API}/auth/me/password"

    assert (await client.post(url, json={"current_password": "wrong-pass", "new_password": "brandnew123"},
                              headers=auth_headers)).status_code == 400
    assert (await client.post(url, json={"current_password": signup_payload["password"], "new_password": "short"},
                              headers=auth_headers)).status_code == 422
    assert (await client.post(url, json={"current_password": signup_payload["password"],
                                         "new_password": signup_payload["password"]},
                              headers=auth_headers)).status_code == 400

    r = await client.post(url, json={"current_password": signup_payload["password"], "new_password": "brandnew123"},
                          headers=auth_headers)
    assert r.status_code == 200, r.text
    fresh = {"Authorization": f"Bearer {r.json()['access_token']}"}
    # The new token works. (That older tokens stop working is checked deterministically in the next test;
    # here they may share the same second as the change, which is deliberately accepted.)
    assert (await client.get(f"{API}/auth/me", headers=fresh)).status_code == 200
    assert other_session  # issued before the change
    assert (await _login(client, "new_user1", signup_payload["password"])).status_code == 401
    assert (await _login(client, "new_user1", "brandnew123")).status_code == 200


async def test_old_tokens_are_rejected_after_password_change(client, session_factory, auth_headers, signup_payload):
    """Deterministic version: move the change time forward instead of waiting."""
    from datetime import timedelta

    from app.core.time import utcnow

    async with session_factory() as s:
        u = (await s.execute(select(User).where(User.username == "new_user1"))).scalar_one()
        u.password_changed_at = utcnow() + timedelta(seconds=5)
        await s.commit()
    assert (await client.get(f"{API}/auth/me", headers=auth_headers)).status_code == 401


async def test_wrong_current_password_counts_toward_lockout(client, auth_headers):
    from app.api.v1.endpoints.auth import username_limiter

    url = f"{API}/auth/me/password"
    for _ in range(username_limiter.max_failures):
        await client.post(url, json={"current_password": "nope-nope", "new_password": "brandnew123"},
                          headers=auth_headers)
    r = await client.post(url, json={"current_password": "nope-nope", "new_password": "brandnew123"},
                          headers=auth_headers)
    assert r.status_code == 429


# ---------- account deletion ----------

async def _count(s, model, *where):
    return (await s.execute(select(func.count()).select_from(model).where(*where))).scalar_one()


async def test_delete_account_removes_everything_and_fixes_counts(client, seeded, session_factory):
    sarah = await _headers(client, "sarah_plumber")
    alex = await _headers(client, "alex_driver")
    elena_id = (await client.get(f"{API}/auth/users/elena_lawyer")).json()["id"]
    sarah_id = (await client.get(f"{API}/auth/users/sarah_plumber")).json()["id"]
    posts = (await client.get(f"{API}/posts/feed")).json()
    alex_post = next(p for p in posts if p["author_username"] == "alex_driver")
    elena_post = next(p for p in posts if p["author_username"] == "elena_lawyer")

    # Sarah interacts with other people's content
    await client.post(f"{API}/posts/{alex_post['id']}/like", headers=sarah)
    await client.post(f"{API}/posts/{alex_post['id']}/bookmark", headers=sarah)
    await client.post(f"{API}/posts/{alex_post['id']}/comments", json={"body": "hi"}, headers=sarah)
    await client.post(f"{API}/community/reviews", json={
        "post_id": alex_post["id"], "clarity_score": 1, "accuracy_score": 1, "feedback_text": "meh"}, headers=sarah)
    q = (await client.post(f"{API}/community/qa/{elena_id}/ask", json={"question_text": "?"}, headers=sarah)).json()
    other_q = (await client.get(f"{API}/community/qa", params={"worker_id": elena_id})).json()
    other_q = next(x for x in other_q if x["asker_username"] != "sarah_plumber")
    await client.post(f"{API}/community/qa/questions/{other_q['id']}/upvote", headers=sarah)
    elena_chal = next(c for c in (await client.get(f"{API}/community/challenges")).json()
                      if c["worker_username"] == "elena_lawyer")
    sarah_idea = next(s for s in elena_chal["suggestions"] if s["suggester_username"] == "sarah_plumber")
    alex_idea = next(s for s in elena_chal["suggestions"] if s["suggester_username"] == "alex_driver")
    elena = await _headers(client, "elena_lawyer")
    await client.post(f"{API}/community/suggestions/{sarah_idea['id']}/accept", headers=elena)
    await client.post(f"{API}/community/suggestions/{alex_idea['id']}/upvote", headers=sarah)
    # Others interact with Sarah's content
    sarah_post = next(p for p in posts if p["author_username"] == "sarah_plumber")
    await client.post(f"{API}/posts/{sarah_post['id']}/like", headers=alex)
    await client.post(f"{API}/stories", json={"media_url": "https://img.example.com/s.jpg"}, headers=sarah)

    before_alex = (await client.get(f"{API}/posts/{alex_post['id']}")).json()
    before_q = next(x for x in (await client.get(f"{API}/community/qa")).json() if x["id"] == other_q["id"])
    before_idea = next(s for c in (await client.get(f"{API}/community/challenges")).json()
                       for s in c["suggestions"] if s["id"] == alex_idea["id"])
    alex_following = (await client.get(f"{API}/auth/users/alex_driver")).json()["following_count"]

    # Wrong password: nothing happens
    assert (await client.post(f"{API}/auth/me/delete", json={"password": "nope"}, headers=sarah)).status_code == 400
    assert (await client.post(f"{API}/auth/me/delete", json={"password": "demo1234"}, headers=sarah)).status_code == 204

    # Sarah is gone and her token no longer works
    assert (await client.get(f"{API}/auth/users/sarah_plumber")).status_code == 404
    assert (await client.get(f"{API}/auth/me", headers=sarah)).status_code == 401
    assert (await _login(client, "sarah_plumber")).status_code == 401

    async with session_factory() as s:
        for model, col in ((Post, Post.author_id), (Story, Story.user_id), (PostLike, PostLike.user_id),
                           (Bookmark, Bookmark.user_id), (PostComment, PostComment.user_id),
                           (TaskReview, TaskReview.user_id), (QAUpvote, QAUpvote.user_id),
                           (SuggestionUpvote, SuggestionUpvote.user_id), (WorkChallenge, WorkChallenge.worker_id),
                           (ChallengeSuggestion, ChallengeSuggestion.suggester_id),
                           (ProfessionProfile, ProfessionProfile.user_id), (UserSurvey, UserSurvey.user_id),
                           (UserInterest, UserInterest.user_id), (User, User.id)):
            assert await _count(s, model, col == sarah_id) == 0, model.__name__
        assert await _count(s, Follow, (Follow.follower_id == sarah_id) | (Follow.followee_id == sarah_id)) == 0
        assert await _count(s, QAQuestion, (QAQuestion.asker_id == sarah_id) | (QAQuestion.worker_id == sarah_id)) == 0
        assert await _count(s, QAQuestion, QAQuestion.id == q["id"]) == 0
        assert await _count(s, PostLike, PostLike.post_id == sarah_post["id"]) == 0

    after_alex = (await client.get(f"{API}/posts/{alex_post['id']}")).json()
    assert after_alex["likes_count"] == before_alex["likes_count"] - 1
    assert after_alex["comments_count"] == before_alex["comments_count"] - 1
    assert after_alex["reviews_count"] == before_alex["reviews_count"] - 1
    assert after_alex["rating"] is None  # Sarah's was the only review
    after_q = next(x for x in (await client.get(f"{API}/community/qa")).json() if x["id"] == other_q["id"])
    assert after_q["upvotes_count"] == before_q["upvotes_count"] - 1
    chal = next(c for c in (await client.get(f"{API}/community/challenges")).json() if c["id"] == elena_chal["id"])
    assert chal["is_solved"] is False  # her accepted idea is gone
    after_idea = next(s for s in chal["suggestions"] if s["id"] == alex_idea["id"])
    assert after_idea["upvotes_count"] == before_idea["upvotes_count"] - 1
    assert (await client.get(f"{API}/auth/users/alex_driver")).json()["following_count"] == alex_following - 1
    assert elena_post["id"] in {p["id"] for p in (await client.get(f"{API}/posts/feed")).json()}
