"""Shared field types for request schemas."""
from typing import Annotated, Optional
from urllib.parse import urlsplit

from pydantic import AfterValidator, BeforeValidator, Field

MAX_URL_LENGTH = 2048


def _require_http_url(v: str) -> str:
    v = v.strip()
    parts = urlsplit(v)
    if parts.scheme.lower() not in ("http", "https") or not parts.netloc:
        raise ValueError("must be a link starting with http:// or https://")
    return v


def _blank_to_none(v):
    return None if isinstance(v, str) and not v.strip() else v


# A media link users submit. Only http(s) is accepted so that javascript:, data: and similar
# schemes can never end up in an <img src> or <a href> rendered for other users.
HttpUrlStr = Annotated[str, Field(max_length=MAX_URL_LENGTH), AfterValidator(_require_http_url)]

# Same, but optional; an empty string is treated as "no link".
OptionalHttpUrlStr = Annotated[Optional[HttpUrlStr], BeforeValidator(_blank_to_none)]
