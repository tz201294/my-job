import calendar
import hashlib
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt

from app.core.config import settings
from app.core.time import utcnow

# bcrypt only considers the first 72 bytes of a password.
MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:MAX_PASSWORD_BYTES], bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:MAX_PASSWORD_BYTES], hashed.encode("utf-8"))
    except ValueError:
        return False


def _epoch(dt: datetime) -> int:
    """Seconds since the epoch for a naive UTC datetime."""
    return calendar.timegm(dt.utctimetuple())


def create_access_token(user_id: str) -> str:
    now = utcnow()
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": user_id, "iat": _epoch(now), "exp": expire}, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_access_token(token: str) -> Optional[dict]:
    """Returns the token's claims ({"sub": user id, "iat": issued-at seconds}), or None if invalid/expired."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    return payload if payload.get("sub") else None


def token_predates_password_change(claims: dict, password_changed_at: Optional[datetime]) -> bool:
    """True if the token was issued before the user's last password change (so it must be rejected).
    Tokens from the same second as the change are accepted: the new token is issued in that second too."""
    if password_changed_at is None:
        return False
    iat = claims.get("iat")
    return not isinstance(iat, int) or iat < _epoch(password_changed_at)


# ---------- one-time links sent by email (password reset, email confirmation) ----------
#
# Signed tokens with an audience ("aud") naming their purpose: a reset token can't be used as a login token or
# as an email-confirmation token, and vice versa (login tokens have no audience, so they fail here too).

PASSWORD_RESET = "password-reset"
EMAIL_VERIFY = "email-verify"


def password_fingerprint(hashed_password: str) -> str:
    """Changes whenever the password does, so a reset link stops working once it has been used."""
    return hashlib.sha256(hashed_password.encode("utf-8")).hexdigest()[:16]


def create_link_token(purpose: str, user_id: str, minutes: int, **claims) -> str:
    now = utcnow()
    payload = {"sub": user_id, "aud": purpose, "iat": _epoch(now), "exp": now + timedelta(minutes=minutes), **claims}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_link_token(token: str, purpose: str) -> Optional[dict]:
    """The claims of a valid, unexpired `purpose` token, or None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM], audience=purpose)
    except jwt.PyJWTError:
        return None
    return payload if payload.get("sub") else None
