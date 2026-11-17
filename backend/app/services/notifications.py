"""Creating and cleaning up notifications."""
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utcnow
from app.models import Notification

SNIPPET_LENGTH = 140
TARGETS = ("post_id", "comment_id", "question_id", "challenge_id", "suggestion_id")


def _snippet(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    text = " ".join(text.split())
    return text if len(text) <= SNIPPET_LENGTH else text[: SNIPPET_LENGTH - 1].rstrip() + "…"


async def notify(
    db: AsyncSession,
    *,
    user_id: str,
    actor_id: str,
    type: str,
    snippet: Optional[str] = None,
    collapse: bool = False,
    **targets: Optional[str],
) -> None:
    """Adds a notification for `user_id` (in the caller's transaction). Never notifies people about
    their own actions. With `collapse`, an unread notification of the same kind from the same person
    about the same thing is refreshed instead of adding another (e.g. follow/unfollow/follow)."""
    if user_id == actor_id:
        return
    unknown = set(targets) - set(TARGETS)
    if unknown:
        raise ValueError(f"unknown notification targets: {unknown}")
    if collapse:
        conds = [Notification.user_id == user_id, Notification.actor_id == actor_id, Notification.type == type,
                 Notification.read_at.is_(None)]
        conds += [getattr(Notification, k) == v if v is not None else getattr(Notification, k).is_(None)
                  for k, v in ((k, targets.get(k)) for k in TARGETS)]
        existing = (await db.execute(select(Notification).where(*conds))).scalars().first()
        if existing:
            existing.created_at = utcnow()
            existing.snippet = _snippet(snippet)
            return
    db.add(Notification(user_id=user_id, actor_id=actor_id, type=type, snippet=_snippet(snippet), **targets))


async def withdraw(db: AsyncSession, *, actor_id: str, type: str, **targets: str) -> None:
    """Removes the unread notifications an action created, when the action is undone (e.g. a removed reaction)."""
    conds = [Notification.actor_id == actor_id, Notification.type == type, Notification.read_at.is_(None)]
    conds += [getattr(Notification, k) == v for k, v in targets.items()]
    await db.execute(delete(Notification).where(*conds))


async def forget(db: AsyncSession, **targets) -> None:
    """Deletes notifications about deleted content. `targets` values are an id or a select of ids.
    (Postgres would cascade these through the foreign keys; SQLite doesn't enforce them.)"""
    for key, value in targets.items():
        col = getattr(Notification, key)
        cond = col.in_(value) if hasattr(value, "subquery") or hasattr(value, "is_select") else col == value
        await db.execute(delete(Notification).where(cond))
