import csv

from scripts import export_survey


async def test_seed_is_idempotent(session_factory):
    from app.db.seed import seed_demo_data

    async with session_factory() as s:
        assert await seed_demo_data(s) is True
    async with session_factory() as s:
        assert await seed_demo_data(s) is False


async def test_survey_export_hides_identity_and_respects_consent(client, session_factory, signup_payload, tmp_path, monkeypatch):
    signup_payload["email"] = "secret@example.com"
    signup_payload["full_name"] = "Secret Name"
    await client.post("/api/v1/auth/register", json=signup_payload)
    await client.post(
        "/api/v1/auth/register",
        json={**signup_payload, "username": "no_consent", "email": None, "data_consent": False},
    )

    monkeypatch.setattr(export_survey, "AsyncSessionLocal", session_factory)
    out = tmp_path / "all.csv"
    assert await export_survey.export(str(out), consented_only=False) == 2
    consented = tmp_path / "consented.csv"
    assert await export_survey.export(str(consented), consented_only=True) == 1

    text = out.read_text(encoding="utf-8")
    for private in ("secret@example.com", "Secret Name", "new_user1", "s3cretpass"):
        assert private not in text

    row = next(csv.DictReader(consented.open(encoding="utf-8")))
    assert row["works"] == "True" and row["industry"] == "Technology & Engineering"
    assert row["gender"] == "female" and row["age"] == "29" and row["country"] == "Israel"
    assert row["interests"] == "data-scientist;software-developer"
