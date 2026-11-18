import pathlib
import re

from app.api import rate_limits
from app.api.v1.endpoints import auth as auth_endpoints
from app.core.i18n import EMAIL, LANGUAGES, MESSAGES, pick_language, translate
from app.services import email as email_service

API = "/api/v1"
APP = pathlib.Path(__file__).resolve().parents[1] / "app"
placeholders = lambda s: sorted(set(re.findall(r"\{(\w+)\}", s)))  # noqa: E731


def test_every_message_has_every_language_with_the_same_placeholders():
    for english, translations in MESSAGES.items():
        assert set(translations) == set(LANGUAGES) - {"en"}, english
        for lang, text in translations.items():
            assert placeholders(text) == placeholders(english), (english, lang)
    for lang in LANGUAGES:
        assert set(EMAIL[lang]) == set(EMAIL["en"]), lang
        for key, text in EMAIL[lang].items():
            assert placeholders(text) == placeholders(EMAIL["en"][key]), (lang, key)


def test_every_error_message_in_the_code_can_be_translated():
    """A new HTTPException message must be added to app/core/i18n.py, or it would stay English for everyone."""
    missing = []
    for path in APP.rglob("*.py"):
        source = path.read_text(encoding="utf-8")
        for literal in re.findall(r'detail="([^"]+)"', source):
            if literal not in MESSAGES:
                missing.append(f"{path.name}: {literal}")
    for _, (_, reason) in rate_limits.RULES.items():
        if reason not in MESSAGES:
            missing.append(f"rate limit: {reason}")
    for name in ("FORGOT_PASSWORD_REPLY", "INVALID_RESET_LINK", "INVALID_VERIFY_LINK", "SUSPENDED_MESSAGE"):
        if getattr(auth_endpoints, name) not in MESSAGES:
            missing.append(f"auth.{name}")
    assert missing == []


def test_picking_the_language_from_the_header():
    assert pick_language("es-MX,es;q=0.9,en;q=0.8") == "es"
    assert pick_language("he-IL,fr;q=0.7") == "fr"
    assert pick_language("ko-KR") == "en"
    assert pick_language(None) == "en"


def test_messages_with_values_are_translated_whole():
    assert translate("You're commenting very fast. Please try again in 5 minutes.", "es") == \
        "Estás comentando muy rápido. Inténtalo de nuevo en 5 minutos."
    assert translate("You're commenting very fast. Please try again in 1 minute.", "de") == \
        "Du kommentierst sehr schnell. Bitte versuche es in 1 Minute erneut."
    assert translate("Too many failed login attempts. Try again in 15 minutes.", "ja") == \
        "ログインの失敗が多すぎます。15分後にもう一度お試しください。"
    assert translate("That photo is too big. The limit is 10 MB.", "fr") == "Cette photo est trop lourde. La limite est de 10 Mo."
    assert translate("Something nobody wrote down", "fr") == "Something nobody wrote down"
    assert translate("Post not found", "en") == "Post not found"


async def test_errors_come_back_in_the_apps_language(client, seeded):
    r = await client.get(f"{API}/posts/no-such-post", headers={"Accept-Language": "es"})
    assert r.status_code == 404 and r.json()["detail"] == "Publicación no encontrada"
    r = await client.get(f"{API}/posts/no-such-post")
    assert r.json()["detail"] == "Post not found"
    r = await client.post(f"{API}/auth/login", headers={"Accept-Language": "ja"},
                          json={"username_or_email": "sarah_plumber", "password": "wrong-pass"})
    assert r.json()["detail"] == "ユーザー名またはパスワードが正しくありません"


async def test_the_account_remembers_its_language_and_emails_use_it(client, signup_payload):
    email_service.outbox.clear()
    r = await client.post(f"{API}/auth/register", headers={"Accept-Language": "fr-FR,fr;q=0.9"},
                          json={**signup_payload, "email": "ana@example.com"})
    assert r.status_code == 201 and r.json()["user"]["language"] == "fr"
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    [mail] = email_service.outbox
    assert mail.subject == "Confirmez votre e-mail pour Prologue" and 'lang="fr"' in mail.html

    r = await client.patch(f"{API}/auth/me", headers=headers, json={"language": "ja"})
    assert r.status_code == 200 and r.json()["language"] == "ja"
    assert (await client.patch(f"{API}/auth/me", headers=headers, json={"language": "xx"})).status_code == 422

    r = await client.post(f"{API}/auth/email/resend", headers={**headers, "Accept-Language": "ja"})
    assert r.json()["detail"] == "ana@example.com に新しい確認リンクを送りました。"
    assert email_service.outbox[-1].subject == "Prologueのメールアドレスを確認してください"
    email_service.outbox.clear()


async def test_success_messages_are_translated_too(client, seeded, auth_headers):
    r = await client.post(f"{API}/auth/password/forgot", headers={"Accept-Language": "de"},
                          json={"username_or_email": "nobody"})
    assert r.json()["detail"].startswith("Wenn dieses Konto eine bestätigte E-Mail-Adresse hat")
    post = (await client.get(f"{API}/posts/feed", params={"author_username": "sarah_plumber"})).json()[0]
    r = await client.post(f"{API}/moderation/reports", headers={**auth_headers, "Accept-Language": "es"},
                          json={"target_type": "post", "target_id": post["id"], "reason": "spam"})
    assert r.json()["detail"] == "Gracias por avisarnos. Un moderador lo revisará."
