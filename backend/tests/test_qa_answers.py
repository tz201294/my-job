API = "/api/v1"


async def _login(client, username):
    r = await client.post(f"{API}/auth/login", json={"username_or_email": username, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _ask(client, headers, worker_username, text="How did you get started?"):
    worker = (await client.get(f"{API}/auth/users/{worker_username}")).json()
    r = await client.post(f"{API}/community/qa/{worker['id']}/ask", json={"question_text": text}, headers=headers)
    assert r.status_code == 201, r.text
    return worker, r.json()


async def test_worker_answers_a_question_addressed_to_them(client, seeded, auth_headers):
    worker, q = await _ask(client, auth_headers, "sarah_plumber")
    sarah = await _login(client, "sarah_plumber")

    r = await client.post(
        f"{API}/community/qa/questions/{q['id']}/answer",
        json={"answer_text": "  Apprenticeship first, then four years on the tools.  ",
              "video_response_url": "https://video.example.com/a.mp4"},
        headers=sarah,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["answer_text"] == "Apprenticeship first, then four years on the tools."
    assert body["video_response_url"] == "https://video.example.com/a.mp4"
    assert body["is_answered"] is True and body["answered_at"]

    # The answer is persisted and visible to everyone.
    listed = next(x for x in (await client.get(f"{API}/community/qa")).json() if x["id"] == q["id"])
    assert listed["answer_text"] == body["answer_text"] and listed["is_answered"] is True


async def test_answer_can_be_edited_and_keeps_first_answer_time(client, seeded, auth_headers):
    _, q = await _ask(client, auth_headers, "alex_driver")
    alex = await _login(client, "alex_driver")
    url = f"{API}/community/qa/questions/{q['id']}/answer"

    first = (await client.post(url, json={"answer_text": "First"}, headers=alex)).json()
    second = await client.post(url, json={"answer_text": "Edited"}, headers=alex)
    assert second.status_code == 200
    assert second.json()["answer_text"] == "Edited"
    assert second.json()["answered_at"] == first["answered_at"]
    assert second.json()["video_response_url"] is None


async def test_only_the_asked_worker_can_answer(client, seeded, auth_headers):
    _, q = await _ask(client, auth_headers, "elena_lawyer")
    url = f"{API}/community/qa/questions/{q['id']}/answer"

    assert (await client.post(url, json={"answer_text": "x"})).status_code == 401
    assert (await client.post(url, json={"answer_text": "x"}, headers=auth_headers)).status_code == 403  # the asker
    other_pro = await _login(client, "sarah_plumber")
    assert (await client.post(url, json={"answer_text": "x"}, headers=other_pro)).status_code == 403
    assert (
        await client.post(f"{API}/community/qa/questions/nope/answer", json={"answer_text": "x"}, headers=other_pro)
    ).status_code == 404


async def test_answer_validation(client, seeded, auth_headers):
    _, q = await _ask(client, auth_headers, "elena_lawyer")
    elena = await _login(client, "elena_lawyer")
    url = f"{API}/community/qa/questions/{q['id']}/answer"

    assert (await client.post(url, json={"answer_text": "   "}, headers=elena)).status_code == 422
    assert (await client.post(url, json={"answer_text": "x" * 5001}, headers=elena)).status_code == 422
    assert (
        await client.post(url, json={"answer_text": "ok", "video_response_url": "javascript:x"}, headers=elena)
    ).status_code == 422
    # Nothing was saved by the rejected attempts.
    listed = next(x for x in (await client.get(f"{API}/community/qa")).json() if x["id"] == q["id"])
    assert listed["is_answered"] is False and listed["answer_text"] is None


async def test_question_list_filters_by_worker_and_answered(client, seeded, auth_headers):
    worker, q = await _ask(client, auth_headers, "sarah_plumber")

    inbox = (await client.get(f"{API}/community/qa", params={"worker_id": worker["id"], "answered": "false"})).json()
    assert inbox and all(x["worker_id"] == worker["id"] and not x["is_answered"] for x in inbox)
    assert q["id"] in {x["id"] for x in inbox}

    answered = (await client.get(f"{API}/community/qa", params={"worker_id": worker["id"], "answered": "true"})).json()
    assert answered and all(x["is_answered"] for x in answered)

    sarah = await _login(client, "sarah_plumber")
    await client.post(f"{API}/community/qa/questions/{q['id']}/answer", json={"answer_text": "Done"}, headers=sarah)
    inbox_after = (await client.get(f"{API}/community/qa", params={"worker_id": worker["id"], "answered": "false"})).json()
    assert q["id"] not in {x["id"] for x in inbox_after}
