import json

from sqlalchemy import select

from app.core.legal import TERMS_VERSION
from app.models import User

API = "/api/v1"


async def test_signing_up_requires_accepting_the_terms(client, signup_payload, session_factory):
    r = await client.post(f"{API}/auth/register", json={**signup_payload, "accept_terms": False})
    assert r.status_code == 422 and "Terms of Service" in r.text
    payload = dict(signup_payload)
    del payload["accept_terms"]
    assert (await client.post(f"{API}/auth/register", json=payload)).status_code == 422

    assert (await client.post(f"{API}/auth/register", json=signup_payload)).status_code == 201
    async with session_factory() as s:
        u = (await s.execute(select(User).where(User.username == "new_user1"))).scalar_one()
    assert u.terms_version == TERMS_VERSION and u.terms_accepted_at is not None


async def test_download_my_data(client, seeded, auth_headers, signup_payload):
    post = (await client.post(f"{API}/posts", headers=auth_headers,
                              json={"title": "My first day", "caption": "Notes", "tags": ["intro"]})).json()
    await client.post(f"{API}/posts/{post['id']}/comments", headers=auth_headers, json={"body": "First!"})
    await client.post(f"{API}/auth/users/sarah_plumber/follow", headers=auth_headers)
    sarah = (await client.get(f"{API}/auth/users/sarah_plumber")).json()
    await client.post(f"{API}/community/qa/{sarah['id']}/ask", headers=auth_headers,
                      json={"question_text": "How did you start?"})
    await client.post(f"{API}/auth/users/alex_driver/block", headers=auth_headers)

    r = await client.get(f"{API}/auth/me/export", headers=auth_headers)
    assert r.status_code == 200
    assert r.headers["content-disposition"] == 'attachment; filename="prologue-data-new_user1.json"'
    data = r.json()
    assert data["account"]["username"] == "new_user1" and data["account"]["terms_version"] == TERMS_VERSION
    assert data["profession"]["title"] == signup_payload["profession"]["title"]
    assert data["sign_up_survey"]["age"] == signup_payload["age"]
    assert data["interests"] == sorted(signup_payload["interests"])
    assert [p["title"] for p in data["posts"]] == ["My first day"] and data["posts"][0]["tags"] == ["intro"]
    assert [c["body"] for c in data["comments"]] == ["First!"]
    assert data["following"] == ["sarah_plumber"] and data["blocked"] == ["alex_driver"]
    assert data["questions_asked"][0]["asked_to"] == "sarah_plumber"

    text = json.dumps(data)
    assert "hashed_password" not in text and "$2b$" not in text  # no password hash
    assert "sarah@" not in text  # nobody else's private details


async def test_export_needs_login(client):
    assert (await client.get(f"{API}/auth/me/export")).status_code == 401
