from sqlalchemy import select

from app.models import ProfessionProfile, UserInterest, UserSurvey, User

API = "/api/v1"


async def test_signup_options(client):
    r = await client.get(f"{API}/auth/signup-options")
    assert r.status_code == 200
    body = r.json()
    assert "Technology & Engineering" in body["interests"]
    assert "Other" in body["industries"] and "Other" not in body["interests"]
    assert "prefer_not_to_say" in body["genders"]


async def test_register_stores_account_and_survey(client, session_factory, signup_payload):
    r = await client.post(f"{API}/auth/register", json=signup_payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["token_type"] == "bearer" and body["access_token"]
    user = body["user"]
    assert user["username"] == "new_user1"  # normalised to lower-case
    assert user["profession"]["title"] == "Backend Developer"
    assert user["profession"]["is_verified_pro"] is False
    assert user["survey"]["gender"] == "female" and user["survey"]["age"] == 29
    assert user["interests"] == ["Science & Research", "Technology & Engineering"]
    assert "hashed_password" not in user and "password" not in user

    async with session_factory() as s:
        u = (await s.execute(select(User).where(User.username == "new_user1"))).scalar_one()
        assert u.hashed_password != signup_payload["password"] and u.hashed_password.startswith("$2")
        survey = (await s.execute(select(UserSurvey).where(UserSurvey.user_id == u.id))).scalar_one()
        assert survey.works is True and survey.country == "Israel" and survey.data_consent is True
        prof = (await s.execute(select(ProfessionProfile).where(ProfessionProfile.user_id == u.id))).scalar_one()
        assert prof.industry == "Technology & Engineering" and prof.years_of_experience == 4
        interests = (await s.execute(select(UserInterest.interest).where(UserInterest.user_id == u.id))).scalars().all()
        assert sorted(interests) == ["Science & Research", "Technology & Engineering"]


async def test_register_non_working_user_has_no_profession(client, signup_payload):
    signup_payload.update(works=False, non_working_status="student")
    signup_payload["profession"] = {"industry": "Legal & Finance", "title": "Ignored"}  # must be discarded
    r = await client.post(f"{API}/auth/register", json=signup_payload)
    assert r.status_code == 201, r.text
    user = r.json()["user"]
    assert user["profession"] is None
    assert user["survey"]["works"] is False and user["survey"]["non_working_status"] == "student"


async def test_register_validation_errors(client, signup_payload):
    cases = {
        "works_without_profession": {"profession": None},
        "no_interests": {"interests": []},
        "unknown_interest": {"interests": ["Underwater Basket Weaving"]},
        "underage": {"age": 9},
        "short_password": {"password": "short"},
        "long_password": {"password": "x" * 80},
        "bad_username": {"username": "no spaces!"},
        "bad_gender": {"gender": "other-ish"},
        "bad_industry": {"profession": {"industry": "Nope", "title": "Dev"}},
    }
    for name, patch in cases.items():
        r = await client.post(f"{API}/auth/register", json={**signup_payload, **patch})
        assert r.status_code == 422, f"{name}: {r.status_code} {r.text}"


async def test_register_ignores_client_supplied_verification(client, signup_payload):
    signup_payload["profession"]["is_verified_pro"] = True
    r = await client.post(f"{API}/auth/register", json=signup_payload)
    assert r.status_code == 201
    assert r.json()["user"]["profession"]["is_verified_pro"] is False


async def test_duplicate_username_and_email(client, signup_payload):
    signup_payload["email"] = "A@Example.com"
    assert (await client.post(f"{API}/auth/register", json=signup_payload)).status_code == 201

    dup_name = await client.post(f"{API}/auth/register", json={**signup_payload, "username": "NEW_USER1", "email": None})
    assert dup_name.status_code == 409

    dup_email = await client.post(
        f"{API}/auth/register", json={**signup_payload, "username": "other_user", "email": "a@example.com"}
    )
    assert dup_email.status_code == 409


async def test_login_by_username_and_email_and_me(client, signup_payload):
    signup_payload["email"] = "me@example.com"
    await client.post(f"{API}/auth/register", json=signup_payload)

    for ident in ("new_user1", "NEW_USER1", "me@example.com"):
        r = await client.post(f"{API}/auth/login", json={"username_or_email": ident, "password": "s3cretpass"})
        assert r.status_code == 200, f"{ident}: {r.text}"

    token = r.json()["access_token"]
    me = await client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "new_user1" and me.json()["email"] == "me@example.com"


async def test_login_rejects_bad_credentials(client, signup_payload):
    await client.post(f"{API}/auth/register", json=signup_payload)
    wrong_pw = await client.post(f"{API}/auth/login", json={"username_or_email": "new_user1", "password": "wrongpass1"})
    no_user = await client.post(f"{API}/auth/login", json={"username_or_email": "ghost", "password": "s3cretpass"})
    assert wrong_pw.status_code == no_user.status_code == 401
    assert wrong_pw.json() == no_user.json()  # identical message: no user enumeration


async def test_me_requires_valid_token(client):
    assert (await client.get(f"{API}/auth/me")).status_code == 401
    bad = await client.get(f"{API}/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert bad.status_code == 401


async def test_public_profile_hides_private_fields(client, signup_payload):
    signup_payload["email"] = "private@example.com"
    await client.post(f"{API}/auth/register", json=signup_payload)
    r = await client.get(f"{API}/auth/users/new_user1")
    assert r.status_code == 200
    body = r.json()
    assert "email" not in body and "survey" not in body and "interests" not in body
    assert (await client.get(f"{API}/auth/users/nobody")).status_code == 404
