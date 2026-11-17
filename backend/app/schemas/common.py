"""Shared field types for request schemas."""
import re
from typing import Annotated, ClassVar, List, Optional
from urllib.parse import urlsplit

from pydantic import AfterValidator, BaseModel, BeforeValidator, Field, StringConstraints, model_validator

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


def NonEmptyStr(max_length: int):
    """Text that is trimmed and must not be empty, capped at the database column size."""
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=max_length)]


def OptionalStr(max_length: int):
    """Optional trimmed text; an empty string becomes None."""
    return Annotated[
        Optional[Annotated[str, StringConstraints(strip_whitespace=True, max_length=max_length)]],
        BeforeValidator(_blank_to_none),
    ]


class PartialUpdate(BaseModel):
    """Base for PATCH bodies: only the fields sent are changed.

    Fields listed in REQUIRED may be left out but not sent as null, because the column can't be empty.
    """
    REQUIRED: ClassVar[tuple] = ()

    @model_validator(mode="after")
    def _required_fields_not_null(self):
        nulls = [f for f in self.REQUIRED if f in self.model_fields_set and getattr(self, f) is None]
        if nulls:
            raise ValueError(f"{', '.join(nulls)} can't be empty")
        return self

    def changes(self) -> dict:
        return {f: getattr(self, f) for f in self.model_fields_set}


MAX_TAGS = 10
MAX_TAG_LENGTH = 30
# A letter or digit (any language), then letters, digits or dashes.
_TAG_RE = re.compile(r"^[^\W_][\w-]*$")


def _normalize_tags(tags: List[str]) -> List[str]:
    """Trims, drops a leading '#', lower-cases and de-duplicates; blank entries are ignored."""
    out: List[str] = []
    for raw in tags:
        tag = raw.strip().lstrip("#").strip().lower()
        if not tag:
            continue
        if len(tag) > MAX_TAG_LENGTH or not _TAG_RE.match(tag) or "_" in tag:
            raise ValueError(
                f'"{raw}" is not a valid tag: use letters, numbers and dashes, up to {MAX_TAG_LENGTH} characters'
            )
        if tag not in out:
            out.append(tag)
    if len(out) > MAX_TAGS:
        raise ValueError(f"Use at most {MAX_TAGS} tags")
    return out


# Post tags as users type them ("#Plumbing", " valve-repair ") stored in one consistent form.
Tags = Annotated[List[str], AfterValidator(_normalize_tags)]
