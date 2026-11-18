"""Reports and moderation.

Anyone signed in can report a post, comment, question, challenge, idea or account. Moderators (ADMIN_USERNAMES)
see open reports grouped by what was reported, and can remove the content, suspend its author, or dismiss the
reports. Suspended accounts can't log in and their content is hidden everywhere (see services/moderation.py).
"""
from collections import Counter, defaultdict
from datetime import datetime
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.rate_limits import limit
from app.core.i18n import pick_language, translate
from app.core.time import utcnow
from app.db.session import get_db
from app.models import ChallengeSuggestion, Post, PostComment, QAQuestion, Report, User, WorkChallenge
from app.services.content import remove_challenge, remove_comment, remove_post, remove_question, remove_suggestion
from app.services.moderation import is_admin, is_hidden_from

router = APIRouter()

TargetType = Literal["post", "comment", "question", "challenge", "suggestion", "user"]
Reason = Literal["spam", "harassment", "hate", "sexual", "violence", "misinformation", "other"]


class ReportCreate(BaseModel):
    target_type: TargetType
    target_id: str = Field(min_length=1, max_length=64)
    reason: Reason
    details: Optional[str] = Field(default=None, max_length=1000)


class Resolve(BaseModel):
    target_type: TargetType
    target_id: str = Field(min_length=1, max_length=64)
    action: Literal["dismiss", "remove", "suspend"]


# What each kind of target is: its model, who owns it, and a short preview for the moderator.
async def _load_target(db: AsyncSession, target_type: str, target_id: str):
    """(object, owner user id, preview dict) or (None, None, None) if it no longer exists."""
    if target_type == "user":
        u = (await db.execute(select(User).where(User.id == target_id))).scalar_one_or_none()
        return (u, u.id, {"title": u.full_name, "text": u.bio}) if u else (None, None, None)
    if target_type == "post":
        p = (await db.execute(select(Post).where(Post.id == target_id))).scalar_one_or_none()
        return (p, p.author_id, {"title": p.title, "text": p.caption, "post_id": p.id}) if p else (None, None, None)
    if target_type == "comment":
        c = (await db.execute(select(PostComment).where(PostComment.id == target_id))).scalar_one_or_none()
        return (c, c.user_id, {"text": c.body, "post_id": c.post_id}) if c else (None, None, None)
    if target_type == "question":
        q = (await db.execute(select(QAQuestion).where(QAQuestion.id == target_id))).scalar_one_or_none()
        return (q, q.asker_id, {"text": q.question_text}) if q else (None, None, None)
    if target_type == "challenge":
        ch = (await db.execute(select(WorkChallenge).where(WorkChallenge.id == target_id))).scalar_one_or_none()
        return ((ch, ch.worker_id, {"title": ch.title, "text": ch.scenario_description, "challenge_id": ch.id})
                if ch else (None, None, None))
    s = (await db.execute(select(ChallengeSuggestion).where(ChallengeSuggestion.id == target_id))).scalar_one_or_none()
    return ((s, s.suggester_id, {"text": s.suggestion_text, "challenge_id": s.challenge_id})
            if s else (None, None, None))


REMOVERS = {
    "post": remove_post, "comment": remove_comment, "question": remove_question,
    "challenge": remove_challenge, "suggestion": remove_suggestion,
}


# ---------- reporting (everyone) ----------

@router.post("/reports", status_code=status.HTTP_201_CREATED, dependencies=[Depends(limit("report"))])
async def create_report(
    body: ReportCreate, request: Request, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    """Report something to the moderators. The person reported isn't told who reported them."""
    target, owner_id, _ = await _load_target(db, body.target_type, body.target_id)
    if target is None or await is_hidden_from(db, user, owner_id):
        raise HTTPException(status_code=404, detail="That no longer exists.")
    if owner_id == user.id:
        raise HTTPException(status_code=400, detail="You can't report your own content.")
    already = (
        await db.execute(select(Report.id).where(
            Report.reporter_id == user.id, Report.target_type == body.target_type,
            Report.target_id == body.target_id, Report.status == "open",
        ))
    ).first()
    if not already:
        details = (body.details or "").strip() or None
        db.add(Report(reporter_id=user.id, target_type=body.target_type, target_id=body.target_id,
                      target_user_id=owner_id, reason=body.reason, details=details))
        await db.commit()
    return {"detail": translate("Thanks for letting us know. A moderator will look at it.",
                                pick_language(request.headers.get("accept-language")))}


# ---------- moderators ----------

async def get_admin(user: User = Depends(get_current_user)) -> User:
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Only moderators can do this")
    return user


def _person(u: Optional[User]) -> Optional[dict]:
    if u is None:
        return None
    return {"id": u.id, "username": u.username, "full_name": u.full_name, "avatar_url": u.avatar_url,
            "is_active": u.is_active}


@router.get("/reports")
async def list_reports(
    status_filter: Literal["open", "dismissed", "removed", "suspended"] = Query("open", alias="status"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin),
):
    """Reports grouped by what was reported, the most reported first (then the oldest)."""
    reports = (
        await db.execute(select(Report).where(Report.status == status_filter).order_by(Report.created_at))
    ).scalars().all()
    groups = defaultdict(list)
    for r in reports:
        groups[(r.target_type, r.target_id)].append(r)

    user_ids = {r.target_user_id for r in reports} | {r.reporter_id for r in reports}
    users = {u.id: u for u in (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()}

    out = []
    for (target_type, target_id), rs in groups.items():
        target, owner_id, preview = await _load_target(db, target_type, target_id)
        out.append({
            "target_type": target_type,
            "target_id": target_id,
            "exists": target is not None,
            "preview": preview,
            "author": _person(users.get(rs[0].target_user_id)),
            "reports_count": len(rs),
            "reasons": dict(Counter(r.reason for r in rs).most_common()),
            "details": [r.details for r in rs if r.details][:5],
            "reporters": [users[r.reporter_id].username for r in rs if r.reporter_id in users][:5],
            "first_reported_at": rs[0].created_at,
            "last_reported_at": rs[-1].created_at,
        })
    out.sort(key=lambda g: (-g["reports_count"], g["first_reported_at"] or datetime.min))
    return out


async def _close(db: AsyncSession, admin: User, new_status: str, *conds) -> int:
    result = await db.execute(
        update(Report).where(Report.status == "open", *conds)
        .values(status=new_status, resolved_at=utcnow(), resolved_by_id=admin.id)
    )
    return result.rowcount or 0


async def _suspend(db: AsyncSession, admin: User, target: User) -> int:
    if target.id == admin.id or is_admin(target):
        raise HTTPException(status_code=400, detail="Moderators can't be suspended here")
    target.is_active = False
    # Everything open about this person or their content is dealt with by the suspension.
    return await _close(db, admin, "suspended", Report.target_user_id == target.id)


@router.post("/reports/resolve", dependencies=[Depends(limit("edit"))])
async def resolve_reports(body: Resolve, db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin)):
    """Deal with every open report about one thing: dismiss them, remove the content, or suspend its author."""
    target, owner_id, _ = await _load_target(db, body.target_type, body.target_id)
    about_target = (Report.target_type == body.target_type, Report.target_id == body.target_id)

    if body.action == "dismiss":
        n = await _close(db, admin, "dismissed", *about_target)
    elif body.action == "remove":
        if body.target_type == "user":
            raise HTTPException(status_code=400, detail="An account can't be removed; suspend it instead")
        if target is not None:
            await REMOVERS[body.target_type](db, target)
        n = await _close(db, admin, "removed", *about_target)
    else:
        if owner_id is None:
            owner_id = (await db.execute(select(Report.target_user_id).where(*about_target))).scalars().first()
        owner = (await db.execute(select(User).where(User.id == owner_id))).scalar_one_or_none() if owner_id else None
        if owner is None:
            raise HTTPException(status_code=404, detail="That account no longer exists")
        n = await _suspend(db, admin, owner)
    await db.commit()
    return {"resolved": n}


@router.get("/suspended")
async def list_suspended(db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin)) -> List[dict]:
    users = (
        await db.execute(select(User).where(User.is_active.is_(False)).order_by(User.username))
    ).scalars().all()
    return [_person(u) for u in users]


async def _user_or_404(db: AsyncSession, username: str) -> User:
    u = (await db.execute(select(User).where(User.username == username.lower()))).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


@router.post("/users/{username}/suspend", dependencies=[Depends(limit("edit"))])
async def suspend_user(username: str, db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin)):
    """Suspend an account: it can't log in (its sessions end) and its content is hidden everywhere."""
    target = await _user_or_404(db, username)
    await _suspend(db, admin, target)
    await db.commit()
    return _person(target)


@router.post("/users/{username}/unsuspend", dependencies=[Depends(limit("edit"))])
async def unsuspend_user(username: str, db: AsyncSession = Depends(get_db), admin: User = Depends(get_admin)):
    """Lift a suspension: the account and its content come back."""
    target = await _user_or_404(db, username)
    target.is_active = True
    await db.commit()
    return _person(target)
