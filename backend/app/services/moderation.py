"""Who may see and reach whom: blocks between two people, and suspended (banned) accounts.

- A suspended account (is_active = False) can't log in, and its content is hidden from everyone.
- If A blocks B, neither sees the other's posts, comments, stories, questions or ideas, and neither can follow,
  comment on, react to, ask, suggest to or notify the other. Existing follows between them are removed.
"""
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import and_, or_, select, union
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Block, User


def is_admin(user: Optional[User]) -> bool:
    return bool(user and user.username in settings.ADMIN_USERNAMES)


def hidden_user_ids(viewer: Optional[User]):
    """A SELECT of the user ids whose content `viewer` mustn't see: suspended accounts, and anyone blocked by
    or blocking the viewer. Use as `Model.author_id.not_in(hidden_user_ids(user))`."""
    suspended = select(User.id).where(User.is_active.is_(False))
    if viewer is None:
        return suspended
    return union(
        suspended,
        select(Block.blocked_id).where(Block.blocker_id == viewer.id),
        select(Block.blocker_id).where(Block.blocked_id == viewer.id),
    )


async def is_hidden_from(db: AsyncSession, viewer: Optional[User], user_id: Optional[str]) -> bool:
    """Whether `user_id`'s content is hidden from `viewer` (for single items: a post, a profile)."""
    if user_id is None or (viewer is not None and viewer.id == user_id):
        return False
    hidden = (await db.execute(select(User.id).where(User.id == user_id, User.id.in_(hidden_user_ids(viewer))))).first()
    return hidden is not None


async def blocked_between(db: AsyncSession, a_id: str, b_id: str) -> bool:
    """Whether either of the two has blocked the other."""
    if a_id == b_id:
        return False
    row = (
        await db.execute(
            select(Block.blocker_id).where(
                or_(and_(Block.blocker_id == a_id, Block.blocked_id == b_id),
                    and_(Block.blocker_id == b_id, Block.blocked_id == a_id))
            )
        )
    ).first()
    return row is not None


async def ensure_can_interact(db: AsyncSession, actor: User, other_id: Optional[str]) -> None:
    """403 if `actor` and `other_id` have blocked each other (either way) or the other account is suspended."""
    if other_id is None or other_id == actor.id:
        return
    if await blocked_between(db, actor.id, other_id):
        raise HTTPException(status_code=403, detail="You can't interact with this account.")
    other_active = (await db.execute(select(User.is_active).where(User.id == other_id))).scalar_one_or_none()
    if other_active is False:
        raise HTTPException(status_code=403, detail="This account is suspended.")
