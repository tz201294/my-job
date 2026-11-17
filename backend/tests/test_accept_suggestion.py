API = "/api/v1"


async def _login(client, username):
    r = await client.post(f"{API}/auth/login", json={"username_or_email": username, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _open_challenge(client):
    """Elena's seeded challenge: two suggestions, none accepted."""
    challenges = (await client.get(f"{API}/community/challenges")).json()
    chal = next(c for c in challenges if c["worker_username"] == "elena_lawyer")
    assert chal["is_solved"] is False and len(chal["suggestions"]) == 2
    return chal


def _accepted(chal):
    return [s["id"] for s in chal["suggestions"] if s["is_accepted_by_worker"]]


async def test_seed_is_consistent(client, seeded):
    challenges = (await client.get(f"{API}/community/challenges")).json()
    for c in challenges:
        assert c["is_solved"] == bool(_accepted(c))


async def test_owner_accepts_switches_and_withdraws(client, seeded):
    chal = await _open_challenge(client)
    first, second = (s["id"] for s in chal["suggestions"])
    elena = await _login(client, "elena_lawyer")

    r = await client.post(f"{API}/community/suggestions/{first}/accept", headers=elena)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == chal["id"] and body["is_solved"] is True and _accepted(body) == [first]

    # Accepting another suggestion replaces the first.
    body = (await client.post(f"{API}/community/suggestions/{second}/accept", headers=elena)).json()
    assert _accepted(body) == [second] and body["is_solved"] is True

    # Accepting the same one again is harmless.
    body = (await client.post(f"{API}/community/suggestions/{second}/accept", headers=elena)).json()
    assert _accepted(body) == [second]

    # Withdrawing a suggestion that isn't accepted changes nothing.
    body = (await client.delete(f"{API}/community/suggestions/{first}/accept", headers=elena)).json()
    assert _accepted(body) == [second] and body["is_solved"] is True

    body = (await client.delete(f"{API}/community/suggestions/{second}/accept", headers=elena)).json()
    assert _accepted(body) == [] and body["is_solved"] is False

    # And it is persisted for everyone.
    again = await _open_challenge(client)
    assert _accepted(again) == []


async def test_only_the_challenge_owner_can_accept(client, seeded, auth_headers):
    chal = await _open_challenge(client)
    sug = chal["suggestions"][0]
    url = f"{API}/community/suggestions/{sug['id']}/accept"

    assert (await client.post(url)).status_code == 401
    assert (await client.post(url, headers=auth_headers)).status_code == 403
    suggester = await _login(client, sug["suggester_username"])  # the person who wrote the idea
    assert (await client.post(url, headers=suggester)).status_code == 403
    assert (await client.delete(url, headers=suggester)).status_code == 403
    elena = await _login(client, "elena_lawyer")
    assert (await client.post(f"{API}/community/suggestions/nope/accept", headers=elena)).status_code == 404

    assert _accepted(await _open_challenge(client)) == []


async def test_accept_response_keeps_my_upvotes(client, seeded):
    chal = await _open_challenge(client)
    sug_id = chal["suggestions"][0]["id"]
    elena = await _login(client, "elena_lawyer")
    await client.post(f"{API}/community/suggestions/{sug_id}/upvote", headers=elena)

    body = (await client.post(f"{API}/community/suggestions/{sug_id}/accept", headers=elena)).json()
    sug = next(s for s in body["suggestions"] if s["id"] == sug_id)
    assert sug["upvoted_by_me"] is True and sug["is_accepted_by_worker"] is True


async def test_database_allows_one_accepted_suggestion_per_challenge(session_factory, seeded):
    import pytest
    from sqlalchemy import select, update
    from sqlalchemy.exc import IntegrityError

    from app.models import ChallengeSuggestion, WorkChallenge

    async with session_factory() as s:
        chal = (await s.execute(select(WorkChallenge).where(WorkChallenge.is_solved.is_(False)))).scalars().first()
        ids = [x.id for x in chal.suggestions]
        assert len(ids) >= 2
        with pytest.raises(IntegrityError):
            await s.execute(
                update(ChallengeSuggestion).where(ChallengeSuggestion.id.in_(ids)).values(is_accepted_by_worker=True)
            )
            await s.commit()
