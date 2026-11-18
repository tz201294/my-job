from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.serializers import notification_out
from app.core.time import utcnow
from app.db.session import get_db
from app.models import Notification, User
from app.schemas.notification import MarkRead, NotificationPage
from app.services.moderation import hidden_user_ids

router = APIRouter()


def _visible(user: User):
    """Your notifications, minus those from suspended accounts or people blocked either way."""
    return (Notification.user_id == user.id, Notification.actor_id.not_in(hidden_user_ids(user)))


async def _unread(db: AsyncSession, user: User) -> int:
    return (
        await db.execute(
            select(func.count()).select_from(Notification)
            .where(*_visible(user), Notification.read_at.is_(None))
        )
    ).scalar_one()


@router.get("", response_model=NotificationPage)
async def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Your notifications, newest first."""
    total = (
        await db.execute(select(func.count()).select_from(Notification).where(*_visible(user)))
    ).scalar_one()
    rows = (
        await db.execute(
            select(Notification).where(*_visible(user))
            .order_by(Notification.created_at.desc(), Notification.id).limit(limit).offset(offset)
        )
    ).scalars().all()
    return {"unread_count": await _unread(db, user), "total": total,
            "notifications": [notification_out(n) for n in rows]}


@router.get("/unread-count")
async def unread_count(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Cheap call for the bell badge; the app polls it."""
    return {"unread_count": await _unread(db, user)}


@router.post("/read")
async def mark_read(body: MarkRead, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Marks the given notifications (or all of them) as read. Only your own are touched."""
    stmt = update(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
    if body.ids is not None:
        stmt = stmt.where(Notification.id.in_(body.ids))
    await db.execute(stmt.values(read_at=utcnow()))
    await db.commit()
    return {"unread_count": await _unread(db, user)}
