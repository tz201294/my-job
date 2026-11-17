import re
import time

import httpx
import jwt
import pytest

from app.api import rate_limits
from app.core.config import settings
from app.core.rate_limit import ActionLimiter
from app.services import email as email_service

API = "/api/v1"


@pytest.fixture(autouse=True)
def empty_outbox():
    email_service.outbox.clear()
    yield
    email_service.outbox.clear()


def _token(message, page):
    m = re.search(rf"https://prologue\.test/{page}#token=([\w.-]+)", message.text)
    assert m, message.text
    return m.group(1)


def _mails_to(address):
    return [m for m in email_service.outbox if m.to == address]


async def _register(client, payload, email):
    r = await client.post(f"{API}/auth/register", json={**payload, "email": email})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}, r.json()["user"]


async def _confirm(client, address):
    token = _token(_mails_to(address)[-1], "verify-email")
    r = await client.post(f"{API}/auth/email/verify", json={"token": token})
    assert r.status_code == 200, r.text


# ---------- confirming the email address ----------

async def test_signup_sends_a_confirmation_link_that_confirms_the_address(client, signup_payload):
    headers, user = await _register(client, signup_payload, "Ana@Example.com")
    assert user["email_verified"] is False
    [mail] = email_service.outbox
    assert mail.to == "ana@example.com" and "Confirm" in mail.subject
    token = _token(mail, "verify-email")

    # Works without being logged in (the link may be opened on another device), and twice is fine.
    for _ in range(2):
        r = await client.post(f"{API}/auth/email/verify", json={"token": token})
        assert r.status_code == 200 and r.json() == {"email": "ana@example.com", "email_verified": True}
    assert (await client.get(f"{API}/auth/me", headers=headers)).json()["email_verified"] is True


async def test_no_email_no_mail(client, signup_payload):
    _, user = await _register(client, signup_payload, None)
    assert user["email_verified"] is False and email_service.outbox == []


async def test_changing_the_address_needs_a_new_confirmation(client, signup_payload):
    headers, _ = await _register(client, signup_payload, "old@example.com")
    old_token = _token(email_service.outbox[-1], "verify-email")
    await _confirm(client, "old@example.com")

    # Same address in other casing: still confirmed, nothing sent.
    r = await client.patch(f"{API}/auth/me", headers=headers, json={"email": "OLD@example.com"})
    assert r.json()["email_verified"] is True and len(email_service.outbox) == 1

    r = await client.patch(f"{API}/auth/me", headers=headers, json={"email": "new@example.com"})
    assert r.json()["email_verified"] is False
    assert len(_mails_to("new@example.com")) == 1
    # The old address's link no longer confirms anything.
    assert (await client.post(f"{API}/auth/email/verify", json={"token": old_token})).status_code == 400
    await _confirm(client, "new@example.com")
    assert (await client.get(f"{API}/auth/me", headers=headers)).json()["email_verified"] is True


async def test_resending_the_confirmation_link(client, signup_payload, monkeypatch):
    monkeypatch.setitem(rate_limits.limiters, "email", ActionLimiter([(2, 3600)]))
    headers, _ = await _register(client, signup_payload, "ana@example.com")
    for _ in range(2):
        r = await client.post(f"{API}/auth/email/resend", headers=headers)
        assert r.status_code == 202 and "ana@example.com" in r.json()["detail"]
    assert len(_mails_to("ana@example.com")) == 3
    assert (await client.post(f"{API}/auth/email/resend", headers=headers)).status_code == 429

    await _confirm(client, "ana@example.com")
    rate_limits.limiters["email"].clear()
    r = await client.post(f"{API}/auth/email/resend", headers=headers)
    assert r.status_code == 400 and "already confirmed" in r.json()["detail"]


async def test_resend_without_an_address(client, signup_payload):
    headers, _ = await _register(client, signup_payload, None)
    r = await client.post(f"{API}/auth/email/resend", headers=headers)
    assert r.status_code == 400 and "Add an email" in r.json()["detail"]


# ---------- forgot password ----------

async def _forgot(client, ident):
    r = await client.post(f"{API}/auth/password/forgot", json={"username_or_email": ident})
    assert r.status_code == 202, r.text
    return r.json()["detail"]


async def test_forgot_password_answers_the_same_for_everyone(client, signup_payload):
    await _register(client, signup_payload, "ana@example.com")  # not confirmed yet
    email_service.outbox.clear()
    replies = {await _forgot(client, ident) for ident in ("nobody", "nobody@example.com", "new_user1", "ana@example.com")}
    assert len(replies) == 1
    assert email_service.outbox == []  # unknown accounts and unconfirmed addresses get nothing


async def test_password_reset_end_to_end(client, signup_payload):
    _, user = await _register(client, signup_payload, "ana@example.com")
    # A session from a minute ago (tokens from the very second of a password change are deliberately accepted).
    stale = jwt.encode({"sub": user["id"], "iat": int(time.time()) - 60, "exp": int(time.time()) + 3600},
                       settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    old_session = {"Authorization": f"Bearer {stale}"}
    assert (await client.get(f"{API}/auth/me", headers=old_session)).status_code == 200
    await _confirm(client, "ana@example.com")
    await _forgot(client, "ANA@example.com")
    [mail] = [m for m in email_service.outbox if "Reset" in m.subject]
    assert mail.to == "ana@example.com" and "@new_user1" in mail.text
    token = _token(mail, "reset-password")

    r = await client.post(f"{API}/auth/password/reset", json={"token": token, "new_password": "brand-new-pass"})
    assert r.status_code == 200, r.text
    new_session = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert (await client.get(f"{API}/auth/me", headers=new_session)).status_code == 200
    assert (await client.get(f"{API}/auth/me", headers=old_session)).status_code == 401  # signed out everywhere

    login = await client.post(f"{API}/auth/login", json={"username_or_email": "new_user1", "password": "brand-new-pass"})
    assert login.status_code == 200
    # The link works once.
    again = await client.post(f"{API}/auth/password/reset", json={"token": token, "new_password": "another-pass1"})
    assert again.status_code == 400 and "already used" in again.json()["detail"]


async def test_links_only_do_their_own_job(client, signup_payload):
    await _register(client, signup_payload, "ana@example.com")
    verify_token = _token(email_service.outbox[-1], "verify-email")
    await _confirm(client, "ana@example.com")
    await _forgot(client, "new_user1")
    reset_token = _token(email_service.outbox[-1], "reset-password")

    for token in (verify_token, reset_token):  # neither logs you in
        assert (await client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})).status_code == 401
    r = await client.post(f"{API}/auth/password/reset", json={"token": verify_token, "new_password": "brand-new-pass"})
    assert r.status_code == 400
    assert (await client.post(f"{API}/auth/email/verify", json={"token": reset_token})).status_code == 400
    tampered = reset_token[:-3] + ("aaa" if not reset_token.endswith("aaa") else "bbb")
    r = await client.post(f"{API}/auth/password/reset", json={"token": tampered, "new_password": "brand-new-pass"})
    assert r.status_code == 400


async def test_expired_reset_link(client, signup_payload, monkeypatch):
    await _register(client, signup_payload, "ana@example.com")
    await _confirm(client, "ana@example.com")
    monkeypatch.setattr(settings, "PASSWORD_RESET_LINK_MINUTES", -1)
    await _forgot(client, "new_user1")
    token = _token(email_service.outbox[-1], "reset-password")
    r = await client.post(f"{API}/auth/password/reset", json={"token": token, "new_password": "brand-new-pass"})
    assert r.status_code == 400 and "expired" in r.json()["detail"]


async def test_reset_emails_stop_quietly_after_a_few(client, signup_payload):
    await _register(client, signup_payload, "ana@example.com")
    await _confirm(client, "ana@example.com")
    for _ in range(5):
        await _forgot(client, "new_user1")  # always the same answer, never 429
    assert len([m for m in email_service.outbox if "Reset" in m.subject]) == 3


async def test_reset_lifts_a_login_lockout(client, signup_payload):
    await _register(client, signup_payload, "ana@example.com")
    await _confirm(client, "ana@example.com")
    for _ in range(settings.LOGIN_MAX_FAILURES_PER_USERNAME):
        await client.post(f"{API}/auth/login", json={"username_or_email": "new_user1", "password": "wrong-guess"})
    await _forgot(client, "new_user1")
    token = _token(email_service.outbox[-1], "reset-password")
    assert (await client.post(f"{API}/auth/password/reset",
                              json={"token": token, "new_password": "brand-new-pass"})).status_code == 200
    login = await client.post(f"{API}/auth/login", json={"username_or_email": "new_user1", "password": "brand-new-pass"})
    assert login.status_code == 200


async def test_reset_rejects_a_weak_password(client):
    r = await client.post(f"{API}/auth/password/reset", json={"token": "x", "new_password": "short"})
    assert r.status_code == 422


# ---------- sending through Brevo ----------

def _fake_brevo(monkeypatch, status=201, body="{}"):
    sent = []

    def handler(request):
        sent.append(request)
        return httpx.Response(status, text=body)

    real = httpx.AsyncClient
    monkeypatch.setattr(email_service.httpx, "AsyncClient",
                        lambda **kw: real(transport=httpx.MockTransport(handler), **kw))
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-test")
    monkeypatch.setattr(settings, "EMAIL_FROM", "hello@prologue.test")
    return sent


async def test_brevo_receives_the_email(monkeypatch):
    sent = _fake_brevo(monkeypatch)
    msg = email_service.verification_email("ana@example.com", "Ana", "https://prologue.test/verify-email#token=t")
    assert await email_service.send_email(msg) is True
    [req] = sent
    assert str(req.url) == email_service.BREVO_URL and req.headers["api-key"] == "xkeysib-test"
    import json
    body = json.loads(req.content)
    assert body["sender"] == {"name": "Prologue", "email": "hello@prologue.test"}
    assert body["to"] == [{"email": "ana@example.com"}] and body["subject"] == msg.subject
    assert "verify-email#token=t" in body["htmlContent"] and "verify-email#token=t" in body["textContent"]
    assert email_service.outbox == []


async def test_a_refused_email_is_logged_not_raised(monkeypatch, caplog):
    _fake_brevo(monkeypatch, status=400, body='{"message":"sender not valid"}')
    msg = email_service.verification_email("ana@example.com", "Ana", "https://prologue.test/x")
    assert await email_service.send_email(msg) is False
    assert "sender not valid" in caplog.text and "xkeysib-test" not in caplog.text


def test_names_in_emails_are_escaped():
    msg = email_service.verification_email("a@example.com", "<script>alert(1)</script>", "https://prologue.test/x")
    assert "<script>" not in msg.html and "&lt;script&gt;" in msg.html
