"""Sending email: account confirmation and password reset links.

With BREVO_API_KEY set, mail goes out through Brevo's HTTP API (Render's free plan blocks the usual SMTP ports, so
an HTTP API it is). Without it nothing is sent: the message is written to the log and kept in `outbox`, which is
what you want for local development and what the tests read.

Emails are sent after the response (FastAPI background tasks), so a slow or failing mail service never slows down
or breaks the request, and response times don't reveal whether an account exists.
"""
import html
import logging
from dataclasses import dataclass
from typing import List

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


@dataclass
class Email:
    to: str
    subject: str
    text: str
    html: str


# Messages "sent" without a mail service (development and tests). Only the most recent few are kept.
outbox: List[Email] = []
_OUTBOX_SIZE = 50


async def send_email(message: Email) -> bool:
    """Sends (or, without a mail service, logs) one email. Never raises: failures are logged (and so reported to
    Sentry when that is on). Returns whether it was handed over."""
    if not settings.BREVO_API_KEY:
        outbox.append(message)
        del outbox[:-_OUTBOX_SIZE]
        logger.warning("Email not sent (no BREVO_API_KEY). To: %s, subject: %s\n%s", message.to, message.subject,
                       message.text)
        return False
    payload = {
        "sender": {"name": settings.EMAIL_FROM_NAME, "email": settings.EMAIL_FROM},
        "to": [{"email": message.to}],
        "subject": message.subject,
        "textContent": message.text,
        "htmlContent": message.html,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(BREVO_URL, json=payload, headers={"api-key": settings.BREVO_API_KEY,
                                                                     "accept": "application/json"})
        if r.status_code >= 300:
            # The response says what's wrong (e.g. sender not verified) but never contains the key.
            logger.error("Brevo refused an email (%s): %s", r.status_code, r.text[:500])
            return False
    except httpx.HTTPError as e:
        logger.error("Could not reach Brevo to send an email: %s", e)
        return False
    return True


# ---------- the emails ----------

def _wrap(title: str, intro: str, button: str, link: str, outro: str) -> str:
    e = html.escape
    return f"""<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px">
    <div style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e2e8f0">
      <p style="margin:0 0 20px;font-size:22px;color:#0f766e"><b>Pro</b>logue</p>
      <h1 style="margin:0 0 12px;font-size:20px">{e(title)}</h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#334155">{e(intro)}</p>
      <a href="{e(link)}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;
         font-weight:bold;font-size:14px;padding:12px 22px;border-radius:10px">{e(button)}</a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b">{e(outro)}</p>
      <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;word-break:break-all">{e(link)}</p>
    </div>
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">Prologue — A story behind every profession</p>
  </div>
</body></html>"""


def verification_email(to: str, name: str, link: str) -> Email:
    days = settings.EMAIL_VERIFY_LINK_DAYS
    intro = (f"Hi {name}, please confirm that this is your email address. You'll then be able to reset your "
             "password with it if you ever forget it.")
    outro = (f"The link works for {days} days. If you didn't create a Prologue account or change your email, "
             "you can ignore this message.")
    text = f"{intro}\n\nConfirm your email: {link}\n\n{outro}\n"
    return Email(to, "Confirm your email for Prologue", text,
                 _wrap("Confirm your email", intro, "Confirm my email", link, outro))


def password_reset_email(to: str, name: str, username: str, link: str) -> Email:
    minutes = settings.PASSWORD_RESET_LINK_MINUTES
    intro = f"Hi {name}, someone (hopefully you) asked to reset the password of the Prologue account @{username}."
    outro = (f"The link works for {minutes} minutes and only once. If you didn't ask for this, ignore this message: "
             "your password stays as it is.")
    text = f"{intro}\n\nChoose a new password: {link}\n\n{outro}\n"
    return Email(to, "Reset your Prologue password", text,
                 _wrap("Reset your password", intro, "Choose a new password", link, outro))
