from sqlalchemy import func, select

from app.models import (
    Bookmark, ChallengeSuggestion, Post, PostLike, QAQuestion, QAUpvote, Story, SuggestionUpvote, TaskDetails,
    TaskReview, WorkChallenge,
)

API = "/api/v1"

WALKTHROUGH = {
    "title": "Replacing a corroded P-Trap",
    "caption": "Quick walkthrough",
    "post_type": "task_walkthrough",
    "tags": ["plumbing"],
    "media": [{"url": "https://img.example.com/a.jpg"}],
    "task_details": {
        "problem_statement": "Leaking trap",
        "category": "Plumbing",
        "difficulty": "beginner",
        "steps": [{"step_number": 1, "title": "Shut off water", "description": "Close valves"}],
    },
}


async def _login(client, username):
    r = await client.post(f"{API}/auth/login", json={"username_or_email": username, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _count(session_factory, model, *where):
    async with session_factory() as s:
        return (await s.execute(select(func.count()).select_from(model).where(*where))).scalar_one()


# ---------- posts ----------

async def test_author_edits_post_fields(client, auth_headers):
    post = (await client.post(f"{API}/posts", json=WALKTHROUGH, headers=auth_headers)).json()
    url = f"{API}/posts/{post['id']}"

    r = await client.patch(url, json={"title": "  New title  ", "tags": ["a", "b"]}, headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["title"] == "New title" and body["tags"] == ["a", "b"]
    assert body["caption"] == "Quick walkthrough"  # untouched
    assert body["task_details"]["steps"][0]["title"] == "Shut off water"
    assert body["post_type"] == "task_walkthrough"

    # Replace the walkthrough
    new_td = {**WALKTHROUGH["task_details"], "difficulty": "expert",
              "steps": [{"step_number": 1, "title": "A", "description": "a"},
                        {"step_number": 2, "title": "B", "description": "b"}]}
    body = (await client.patch(url, json={"task_details": new_td}, headers=auth_headers)).json()
    assert body["task_details"]["difficulty"] == "expert" and len(body["task_details"]["steps"]) == 2

    # Remove the walkthrough and the media
    body = (await client.patch(url, json={"task_details": None, "media": []}, headers=auth_headers)).json()
    assert body["task_details"] is None and body["media"] == []

    fetched = (await client.get(url)).json()
    assert fetched["title"] == "New title" and fetched["task_details"] is None


async def test_post_edit_validation_and_permissions(client, seeded, auth_headers):
    post = (await client.post(f"{API}/posts", json=WALKTHROUGH, headers=auth_headers)).json()
    url = f"{API}/posts/{post['id']}"

    assert (await client.patch(url, json={"title": "x"})).status_code == 401
    other = await _login(client, "sarah_plumber")
    assert (await client.patch(url, json={"title": "x"}, headers=other)).status_code == 403
    assert (await client.delete(url, headers=other)).status_code == 403
    assert (await client.patch(f"{API}/posts/nope", json={"title": "x"}, headers=auth_headers)).status_code == 404

    for bad in ({"title": "   "}, {"title": None}, {"caption": None}, {"title": "x" * 256},
                {"media": [{"url": "javascript:x"}]}):
        assert (await client.patch(url, json=bad, headers=auth_headers)).status_code == 422, bad
    assert (await client.get(url)).json()["title"] == WALKTHROUGH["title"]


async def test_deleting_a_post_removes_its_likes_saves_reviews_and_details(client, seeded, session_factory, auth_headers):
    post = (await client.post(f"{API}/posts", json=WALKTHROUGH, headers=auth_headers)).json()
    pid = post["id"]
    await client.post(f"{API}/posts/{pid}/like", headers=auth_headers)
    await client.post(f"{API}/posts/{pid}/bookmark", headers=auth_headers)
    sarah = await _login(client, "sarah_plumber")
    await client.post(f"{API}/posts/{pid}/like", headers=sarah)
    r = await client.post(
        f"{API}/community/reviews",
        json={"post_id": pid, "clarity_score": 5, "accuracy_score": 4, "feedback_text": "Clear"},
        headers=sarah,
    )
    assert r.status_code == 201, r.text

    assert (await client.delete(f"{API}/posts/{pid}", headers=auth_headers)).status_code == 204
    assert (await client.get(f"{API}/posts/{pid}")).status_code == 404
    assert (await client.delete(f"{API}/posts/{pid}", headers=auth_headers)).status_code == 404
    for model in (PostLike, Bookmark, TaskReview, TaskDetails):
        assert await _count(session_factory, model, model.post_id == pid) == 0, model.__name__
    assert pid not in {p["id"] for p in (await client.get(f"{API}/posts/bookmarks", headers=auth_headers)).json()}


# ---------- stories ----------

async def test_author_deletes_story(client, seeded, session_factory, auth_headers):
    story = (await client.post(f"{API}/stories", json={"media_url": "https://img.example.com/s.jpg"},
                               headers=auth_headers)).json()
    url = f"{API}/stories/{story['id']}"
    sarah = await _login(client, "sarah_plumber")
    assert (await client.delete(url, headers=sarah)).status_code == 403
    assert (await client.delete(url)).status_code == 401
    assert (await client.delete(url, headers=auth_headers)).status_code == 204
    assert await _count(session_factory, Story, Story.id == story["id"]) == 0
    assert (await client.delete(url, headers=auth_headers)).status_code == 404


# ---------- questions ----------

async def _ask(client, headers, worker="elena_lawyer"):
    w = (await client.get(f"{API}/auth/users/{worker}")).json()
    r = await client.post(f"{API}/community/qa/{w['id']}/ask", json={"question_text": "Original?"}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


async def test_asker_edits_question_until_answered(client, seeded, auth_headers):
    q = await _ask(client, auth_headers)
    url = f"{API}/community/qa/questions/{q['id']}"

    body = (await client.patch(url, json={"question_text": " Reworded? ", "topic_tag": ""}, headers=auth_headers)).json()
    assert body["question_text"] == "Reworded?" and body["topic_tag"] == "General Inquiry"

    elena = await _login(client, "elena_lawyer")
    assert (await client.patch(url, json={"question_text": "x"}, headers=elena)).status_code == 403
    assert (await client.patch(url, json={"question_text": "  "}, headers=auth_headers)).status_code == 422
    assert (await client.patch(url, json={"question_text": None}, headers=auth_headers)).status_code == 422

    await client.post(f"{url}/answer", json={"answer_text": "Answer"}, headers=elena)
    assert (await client.patch(url, json={"question_text": "Changed"}, headers=auth_headers)).status_code == 409


async def test_asker_or_worker_deletes_question(client, seeded, session_factory, auth_headers):
    sarah = await _login(client, "sarah_plumber")
    elena = await _login(client, "elena_lawyer")

    q1 = await _ask(client, auth_headers)
    await client.post(f"{API}/community/qa/questions/{q1['id']}/upvote", headers=sarah)
    assert (await client.delete(f"{API}/community/qa/questions/{q1['id']}", headers=sarah)).status_code == 403
    assert (await client.delete(f"{API}/community/qa/questions/{q1['id']}", headers=auth_headers)).status_code == 204
    assert await _count(session_factory, QAQuestion, QAQuestion.id == q1["id"]) == 0
    assert await _count(session_factory, QAUpvote, QAUpvote.question_id == q1["id"]) == 0

    q2 = await _ask(client, auth_headers)
    assert (await client.delete(f"{API}/community/qa/questions/{q2['id']}", headers=elena)).status_code == 204
    assert (await client.delete(f"{API}/community/qa/questions/{q2['id']}", headers=elena)).status_code == 404


async def test_question_length_limits_on_create(client, seeded, auth_headers):
    w = (await client.get(f"{API}/auth/users/elena_lawyer")).json()
    url = f"{API}/community/qa/{w['id']}/ask"
    assert (await client.post(url, json={"question_text": "  "}, headers=auth_headers)).status_code == 422
    assert (await client.post(url, json={"question_text": "x" * 2001}, headers=auth_headers)).status_code == 422
    assert (await client.post(url, json={"question_text": "ok", "topic_tag": "t" * 65}, headers=auth_headers)).status_code == 422


# ---------- challenges & suggestions ----------

CHALLENGE = {"title": "Odd noise", "scenario_description": "Rattles at night", "profession_category": "Plumbing"}


async def test_owner_edits_and_deletes_challenge(client, seeded, session_factory, auth_headers):
    chal = (await client.post(f"{API}/community/challenges", json=CHALLENGE, headers=auth_headers)).json()
    url = f"{API}/community/challenges/{chal['id']}"
    sarah = await _login(client, "sarah_plumber")

    body = (await client.patch(url, json={"title": "Louder noise", "urgency_level": "urgent"}, headers=auth_headers)).json()
    assert body["title"] == "Louder noise" and body["urgency_level"] == "urgent"
    assert body["scenario_description"] == "Rattles at night"
    assert (await client.patch(url, json={"title": "x"}, headers=sarah)).status_code == 403
    assert (await client.patch(url, json={"title": None}, headers=auth_headers)).status_code == 422
    assert (await client.patch(url, json={"title": "x" * 256}, headers=auth_headers)).status_code == 422

    sug = (await client.post(f"{url}/suggest", json={"suggestion_text": "Check PRV"}, headers=sarah)).json()
    await client.post(f"{API}/community/suggestions/{sug['id']}/upvote", headers=auth_headers)

    assert (await client.delete(url, headers=sarah)).status_code == 403
    assert (await client.delete(url, headers=auth_headers)).status_code == 204
    assert await _count(session_factory, WorkChallenge, WorkChallenge.id == chal["id"]) == 0
    assert await _count(session_factory, ChallengeSuggestion, ChallengeSuggestion.challenge_id == chal["id"]) == 0
    assert await _count(session_factory, SuggestionUpvote, SuggestionUpvote.suggestion_id == sug["id"]) == 0


async def test_suggestion_edit_and_delete_rules(client, seeded, session_factory, auth_headers):
    chal = (await client.post(f"{API}/community/challenges", json=CHALLENGE, headers=auth_headers)).json()
    sarah = await _login(client, "sarah_plumber")
    alex = await _login(client, "alex_driver")
    sug = (await client.post(f"{API}/community/challenges/{chal['id']}/suggest",
                             json={"suggestion_text": "Check PRV", "suggested_tool_or_reference": "Gauge"},
                             headers=sarah)).json()
    url = f"{API}/community/suggestions/{sug['id']}"

    body = (await client.patch(url, json={"suggestion_text": "Check the PRV first", "suggested_tool_or_reference": ""},
                               headers=sarah)).json()
    assert body["suggestion_text"] == "Check the PRV first" and body["suggested_tool_or_reference"] is None
    assert (await client.patch(url, json={"suggestion_text": "x"}, headers=auth_headers)).status_code == 403  # owner
    assert (await client.patch(url, json={"suggested_tool_or_reference": "t" * 256}, headers=sarah)).status_code == 422

    # Once accepted it can't be edited; deleting it reopens the challenge.
    await client.post(f"{url}/accept", headers=auth_headers)
    assert (await client.patch(url, json={"suggestion_text": "x"}, headers=sarah)).status_code == 409
    assert (await client.delete(url, headers=alex)).status_code == 403
    assert (await client.delete(url, headers=sarah)).status_code == 204
    c = next(x for x in (await client.get(f"{API}/community/challenges")).json() if x["id"] == chal["id"])
    assert c["is_solved"] is False and c["suggestions"] == []

    # The challenge owner can remove someone else's idea too.
    other = (await client.post(f"{API}/community/challenges/{chal['id']}/suggest",
                               json={"suggestion_text": "Spam"}, headers=alex)).json()
    await client.post(f"{API}/community/suggestions/{other['id']}/upvote", headers=sarah)
    assert (await client.delete(f"{API}/community/suggestions/{other['id']}", headers=auth_headers)).status_code == 204
    assert await _count(session_factory, SuggestionUpvote, SuggestionUpvote.suggestion_id == other["id"]) == 0


async def test_challenge_and_suggestion_limits_on_create(client, auth_headers):
    url = f"{API}/community/challenges"
    assert (await client.post(url, json={**CHALLENGE, "title": "  "}, headers=auth_headers)).status_code == 422
    assert (await client.post(url, json={**CHALLENGE, "profession_category": "c" * 129}, headers=auth_headers)).status_code == 422
    chal = (await client.post(url, json=CHALLENGE, headers=auth_headers)).json()
    r = await client.post(f"{url}/{chal['id']}/suggest", json={"suggestion_text": " "}, headers=auth_headers)
    assert r.status_code == 422


# ---------- tags ----------

async def test_tags_are_normalized_on_create_and_edit(client, auth_headers):
    body = {"title": "T", "caption": "C", "tags": [" #Plumbing ", "plumbing", "valve-repair", "", "צנרת", "#2024"]}
    r = await client.post(f"{API}/posts", json=body, headers=auth_headers)
    assert r.status_code == 201, r.text
    post = r.json()
    assert post["tags"] == ["plumbing", "valve-repair", "צנרת", "2024"]
    r = await client.patch(f"{API}/posts/{post['id']}", json={"tags": ["#NewTag"]}, headers=auth_headers)
    assert r.json()["tags"] == ["newtag"]


async def test_invalid_tags_are_rejected(client, auth_headers):
    url = f"{API}/posts"
    for tags in (["two words"], ["semi;colon"], ["x" * 31], ["-dash-first"], ["snake_case"], [f"t{i}" for i in range(11)]):
        r = await client.post(url, json={"title": "T", "caption": "C", "tags": tags}, headers=auth_headers)
        assert r.status_code == 422, tags
