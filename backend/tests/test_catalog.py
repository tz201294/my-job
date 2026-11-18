import json
import pathlib

from app.core.professions import CATALOG, FIELD_OF
from app.core.taxonomy import INDUSTRY_OPTIONS

API = "/api/v1"
FRONTEND_COPY = pathlib.Path(__file__).resolve().parents[2] / "frontend" / "src" / "catalog" / "professions.json"


def test_the_server_and_the_website_use_the_same_catalog():
    # Render builds only the backend folder, so the server keeps its own copy; it must match the website's.
    if FRONTEND_COPY.exists():
        assert json.loads(FRONTEND_COPY.read_text(encoding="utf-8")) == CATALOG


def test_the_catalog_is_consistent():
    slugs = [p["slug"] for p in CATALOG]
    assert len(slugs) == len(set(slugs)) >= 50
    for p in CATALOG:
        assert p["field"] in INDUSTRY_OPTIONS, p
        assert p["related"] and all(r in FIELD_OF and r != p["slug"] for r in p["related"]), p
    # every field has professions
    assert {p["field"] for p in CATALOG} == set(INDUSTRY_OPTIONS) - {"Other"}


async def test_sample_people_are_in_their_professions(client, seeded):
    catalog = {p["slug"]: p for p in (await client.get(f"{API}/professions")).json()}
    assert catalog["plumber"]["people_count"] == 1 and catalog["nurse"]["people_count"] == 0
    assert catalog["plumber"]["field"] == "Trades & Craftsmanship"
    people = (await client.get(f"{API}/professions/plumber/people")).json()
    assert [u["username"] for u in people] == ["sarah_plumber"]
    assert people[0]["profession"]["catalog_slug"] == "plumber"
    assert (await client.get(f"{API}/professions/astronaut/people")).status_code == 404


async def test_picking_a_profession_at_sign_up_sets_the_field(client, signup_payload):
    payload = {**signup_payload, "profession": {**signup_payload["profession"], "industry": "Other",
                                                "title": "ICU nurse", "catalog_slug": "nurse"}}
    r = await client.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 201, r.text
    prof = r.json()["user"]["profession"]
    assert (prof["catalog_slug"], prof["industry"], prof["title"]) == ("nurse", "Healthcare & Medicine", "ICU nurse")

    bad = {**signup_payload, "username": "other_one",
           "profession": {**signup_payload["profession"], "catalog_slug": "astronaut"}}
    r = await client.post(f"{API}/auth/register", json=bad)
    assert r.status_code == 422 and "Unknown profession" in r.text


async def test_changing_profession_in_settings_and_filtering_posts(client, seeded, auth_headers):
    r = await client.patch(f"{API}/auth/me", headers=auth_headers, json={"profession": {
        "industry": "Other", "title": "Electrician", "catalog_slug": "electrician", "years_of_experience": 3,
    }})
    assert r.status_code == 200 and r.json()["profession"]["catalog_slug"] == "electrician"
    assert r.json()["profession"]["industry"] == "Trades & Craftsmanship"
    people = (await client.get(f"{API}/professions/electrician/people")).json()
    assert [u["username"] for u in people] == ["new_user1"]

    plumber_posts = (await client.get(f"{API}/posts/feed", params={"profession": "plumber"})).json()
    assert plumber_posts and {p["author_username"] for p in plumber_posts} == {"sarah_plumber"}


async def test_blocked_people_are_left_out(client, seeded, auth_headers):
    await client.post(f"{API}/auth/users/sarah_plumber/block", headers=auth_headers)
    assert (await client.get(f"{API}/professions/plumber/people", headers=auth_headers)).json() == []
    catalog = {p["slug"]: p for p in (await client.get(f"{API}/professions", headers=auth_headers)).json()}
    assert catalog["plumber"]["people_count"] == 0
