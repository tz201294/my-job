API = "/api/v1"

POST_BODY = {
    "title": "Replacing a corroded P-Trap",
    "caption": "Quick walkthrough",
    "post_type": "task_walkthrough",
    "tags": ["plumbing"],
    "task_details": {
        "problem_statement": "Leaking trap under a sink",
        "category": "Plumbing",
        "difficulty": "beginner",
        "estimated_time_mins": 30,
        "tools_used": ["Pipe wrench"],
        "steps": [{"step_number": 1, "title": "Shut off water", "description": "Close valves"}],
    },
}


async def test_feed_is_public_and_seeded(client, seeded):
    r = await client.get(f"{API}/posts/feed")
    assert r.status_code == 200
    posts = r.json()
    assert len(posts) == 3
    assert all(p["is_liked_by_me"] is False for p in posts)
    assert posts[0]["task_details"]["steps"]


async def test_feed_filters(client, seeded):
    by_type = (await client.get(f"{API}/posts/feed", params={"post_type": "pro_case_study"})).json()
    assert len(by_type) == 1 and by_type[0]["author_username"] == "elena_lawyer"
    by_cat = (await client.get(f"{API}/posts/feed", params={"profession_category": "plumbing"})).json()
    assert len(by_cat) == 1 and by_cat[0]["author_username"] == "sarah_plumber"
    page = (await client.get(f"{API}/posts/feed", params={"limit": 1, "offset": 1})).json()
    assert len(page) == 1


async def test_create_post_requires_auth_and_uses_current_user(client, auth_headers):
    assert (await client.post(f"{API}/posts", json=POST_BODY)).status_code == 401

    r = await client.post(f"{API}/posts", json=POST_BODY, headers=auth_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["author_username"] == "new_user1"
    assert body["author_profession_title"] == "Backend Developer"
    assert body["task_details"]["category"] == "Plumbing"

    fetched = await client.get(f"{API}/posts/{body['id']}")
    assert fetched.status_code == 200 and fetched.json()["title"] == POST_BODY["title"]
    assert (await client.get(f"{API}/posts/nope")).status_code == 404


async def test_like_toggle_is_per_user_and_persisted(client, seeded, auth_headers):
    post_id = (await client.get(f"{API}/posts/feed")).json()[0]["id"]
    before = (await client.get(f"{API}/posts/{post_id}")).json()["likes_count"]

    assert (await client.post(f"{API}/posts/{post_id}/like")).status_code == 401

    liked = (await client.post(f"{API}/posts/{post_id}/like", headers=auth_headers)).json()
    assert liked["is_liked"] is True and liked["likes_count"] == before + 1

    mine = (await client.get(f"{API}/posts/{post_id}", headers=auth_headers)).json()
    anon = (await client.get(f"{API}/posts/{post_id}")).json()
    assert mine["is_liked_by_me"] is True and anon["is_liked_by_me"] is False

    unliked = (await client.post(f"{API}/posts/{post_id}/like", headers=auth_headers)).json()
    assert unliked["is_liked"] is False and unliked["likes_count"] == before


async def test_stories_active_only_and_grouped(client, seeded, auth_headers):
    groups = (await client.get(f"{API}/stories/feed")).json()
    assert {g["username"] for g in groups} == {"sarah_plumber", "alex_driver", "elena_lawyer"}

    assert (await client.post(f"{API}/stories", json={"media_url": "http://x/y.jpg"})).status_code == 401
    r = await client.post(f"{API}/stories", json={"media_url": "http://x/y.jpg", "caption": "hi"}, headers=auth_headers)
    assert r.status_code == 201
    assert r.json()["author_username"] == "new_user1" and r.json()["views_count"] == 0

    groups = (await client.get(f"{API}/stories/feed")).json()
    assert "new_user1" in {g["username"] for g in groups}


async def test_discovery_counts_and_search(client, seeded):
    cats = (await client.get(f"{API}/discovery/categories")).json()
    by_name = {c["name"]: c for c in cats}
    assert by_name["Trades & Craftsmanship"]["professions_count"] == 1
    assert by_name["Trades & Craftsmanship"]["active_stories_count"] == 1
    assert by_name["Science & Research"]["professions_count"] == 0

    found = (await client.get(f"{API}/discovery/search", params={"q": "plumber"})).json()
    assert [c["slug"] for c in found["matching_categories"]] == ["trades"]


async def test_reviews_update_post_rating(client, seeded, auth_headers):
    post = next(p for p in (await client.get(f"{API}/posts/feed")).json() if p["author_username"] == "sarah_plumber")
    body = {"post_id": post["id"], "clarity_score": 4, "accuracy_score": 3, "feedback_text": "Useful"}

    assert (await client.post(f"{API}/community/reviews", json=body)).status_code == 401
    r = await client.post(f"{API}/community/reviews", json=body, headers=auth_headers)
    assert r.status_code == 201 and r.json()["username"] == "new_user1"
    assert r.json()["is_peer_verified"] is False  # new users are never auto-verified

    reviews = (await client.get(f"{API}/community/reviews/{post['id']}")).json()
    assert len(reviews) == 1
    bad = await client.post(f"{API}/community/reviews", json={**body, "post_id": "missing"}, headers=auth_headers)
    assert bad.status_code == 404


async def test_qa_and_challenges_flow(client, seeded, auth_headers):
    elena = (await client.get(f"{API}/auth/users/elena_lawyer")).json()
    qa = (await client.get(f"{API}/community/qa/{elena['id']}")).json()
    assert qa["worker_name"] == "Elena Vance, Esq." and qa["answered_questions"] == 1
    before = qa["total_questions"]

    r = await client.post(
        f"{API}/community/qa/{elena['id']}/ask", json={"question_text": "How do you start your day?"}, headers=auth_headers
    )
    assert r.status_code == 201 and r.json()["asker_username"] == "new_user1" and r.json()["is_answered"] is False
    assert (await client.get(f"{API}/community/qa/{elena['id']}")).json()["total_questions"] == before + 1
    assert (await client.get(f"{API}/community/qa/missing")).status_code == 404

    chal = await client.post(
        f"{API}/community/challenges",
        json={"title": "Odd noise", "scenario_description": "Rattles at night", "profession_category": "Plumbing"},
        headers=auth_headers,
    )
    assert chal.status_code == 201
    cid = chal.json()["id"]
    sug = await client.post(
        f"{API}/community/challenges/{cid}/suggest", json={"suggestion_text": "Check the PRV"}, headers=auth_headers
    )
    assert sug.status_code == 201 and sug.json()["suggester_username"] == "new_user1"

    plumbing = (await client.get(f"{API}/community/challenges", params={"category": "plumbing"})).json()
    assert len(plumbing) == 2
    mine = next(c for c in plumbing if c["id"] == cid)
    assert len(mine["suggestions"]) == 1
    assert (await client.post(f"{API}/community/challenges/nope/suggest", json={"suggestion_text": "x"}, headers=auth_headers)).status_code == 404


# --- Wiring milestone: Q&A list, upvotes, professionals, author filter, review guards ---


async def test_global_qa_list_and_question_upvote_toggle(client, seeded, auth_headers):
    qs = (await client.get(f"{API}/community/qa")).json()
    assert qs and all(q["upvoted_by_me"] is False for q in qs)
    assert qs[0]["worker_full_name"] and "asker_username" in qs[0]
    qid, base = qs[0]["id"], qs[0]["upvotes_count"]

    assert (await client.post(f"{API}/community/qa/questions/{qid}/upvote")).status_code == 401
    assert (await client.post(f"{API}/community/qa/questions/nope/upvote", headers=auth_headers)).status_code == 404

    on = (await client.post(f"{API}/community/qa/questions/{qid}/upvote", headers=auth_headers)).json()
    assert on == {"id": qid, "upvoted": True, "upvotes_count": base + 1}

    mine = next(q for q in (await client.get(f"{API}/community/qa", headers=auth_headers)).json() if q["id"] == qid)
    anon = next(q for q in (await client.get(f"{API}/community/qa")).json() if q["id"] == qid)
    assert mine["upvoted_by_me"] is True and anon["upvoted_by_me"] is False

    off = (await client.post(f"{API}/community/qa/questions/{qid}/upvote", headers=auth_headers)).json()
    assert off["upvoted"] is False and off["upvotes_count"] == base


async def test_suggestion_upvote_toggle(client, seeded, auth_headers):
    chals = (await client.get(f"{API}/community/challenges")).json()
    sug = next(s for c in chals for s in c["suggestions"])
    base = sug["upvotes_count"]

    assert (await client.post(f"{API}/community/suggestions/{sug['id']}/upvote")).status_code == 401
    assert (await client.post(f"{API}/community/suggestions/nope/upvote", headers=auth_headers)).status_code == 404

    on = (await client.post(f"{API}/community/suggestions/{sug['id']}/upvote", headers=auth_headers)).json()
    assert on["upvoted"] is True and on["upvotes_count"] == base + 1

    again = (await client.get(f"{API}/community/challenges", headers=auth_headers)).json()
    got = next(s for c in again for s in c["suggestions"] if s["id"] == sug["id"])
    assert got["upvoted_by_me"] is True

    off = (await client.post(f"{API}/community/suggestions/{sug['id']}/upvote", headers=auth_headers)).json()
    assert off["upvoted"] is False and off["upvotes_count"] == base


async def test_professionals_list(client, seeded):
    r = await client.get(f"{API}/auth/professionals")
    assert r.status_code == 200
    names = {u["username"] for u in r.json()}
    assert {"elena_lawyer", "sarah_plumber", "alex_driver"} <= names


async def test_feed_author_filter(client, seeded):
    posts = (await client.get(f"{API}/posts/feed", params={"author_username": "elena_lawyer"})).json()
    assert posts and all(p["author_username"] == "elena_lawyer" for p in posts)
    assert (await client.get(f"{API}/posts/feed", params={"author_username": "nobody"})).json() == []


async def test_review_guards_and_rating_null_before_reviews(client, seeded, auth_headers):
    created = (await client.post(f"{API}/posts", json=POST_BODY, headers=auth_headers)).json()
    assert created["rating"] is None and created["reviews_count"] == 0

    own = {"post_id": created["id"], "clarity_score": 5, "accuracy_score": 5, "feedback_text": "mine"}
    assert (await client.post(f"{API}/community/reviews", json=own, headers=auth_headers)).status_code == 400

    other = next(p for p in (await client.get(f"{API}/posts/feed")).json() if p["author_username"] == "sarah_plumber")
    body = {"post_id": other["id"], "clarity_score": 4, "accuracy_score": 4, "feedback_text": "ok"}
    assert (await client.post(f"{API}/community/reviews", json=body, headers=auth_headers)).status_code == 201
    assert (await client.post(f"{API}/community/reviews", json=body, headers=auth_headers)).status_code == 409

    updated = (await client.get(f"{API}/posts/{other['id']}")).json()
    assert updated["rating"] == 4.0 and updated["reviews_count"] == 1

