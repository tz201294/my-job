"""Everything Prologue stores about one person, as one JSON document ("Download my data" in Settings).

Built from the database tables directly, so a new column shows up in the export without extra work. Only the
password hash is left out. Other people appear by username only (who you follow, who asked you a question).
"""
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utcnow
from app.models import (
    Block, Bookmark, ChallengeSuggestion, CommentReaction, Follow, Notification, Post, PostComment, PostLike,
    ProfessionProfile, QAQuestion, QAUpvote, Report, Story, SuggestionUpvote, TaskDetails, TaskReview, User,
    UserInterest, UserSurvey, WorkChallenge,
)

PRIVATE_COLUMNS = {"hashed_password"}


def _row(obj, drop=()) -> dict:
    out = {}
    for col in obj.__table__.columns:
        if col.key in PRIVATE_COLUMNS or col.key in drop:
            continue
        value = getattr(obj, col.key)
        out[col.key] = value.isoformat() if isinstance(value, (datetime, date)) else value
    return out


async def _all(db: AsyncSession, stmt):
    return (await db.execute(stmt)).scalars().all()


async def _usernames(db: AsyncSession, ids) -> dict:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    rows = (await db.execute(select(User.id, User.username).where(User.id.in_(ids)))).all()
    return dict(rows)


async def export_user_data(db: AsyncSession, user: User) -> dict:
    uid = user.id
    profession = (await db.execute(select(ProfessionProfile).where(ProfessionProfile.user_id == uid))).scalar_one_or_none()
    survey = (await db.execute(select(UserSurvey).where(UserSurvey.user_id == uid))).scalar_one_or_none()
    interests = await _all(db, select(UserInterest.interest).where(UserInterest.user_id == uid))

    posts = await _all(db, select(Post).where(Post.author_id == uid).order_by(Post.created_at))
    details = {
        d.post_id: _row(d)
        for d in await _all(db, select(TaskDetails).where(TaskDetails.post_id.in_([p.id for p in posts])))
    }
    following = await _all(db, select(Follow.followee_id).where(Follow.follower_id == uid))
    followers = await _all(db, select(Follow.follower_id).where(Follow.followee_id == uid))
    blocked = await _all(db, select(Block.blocked_id).where(Block.blocker_id == uid))
    asked = await _all(db, select(QAQuestion).where(QAQuestion.asker_id == uid).order_by(QAQuestion.created_at))
    received = await _all(db, select(QAQuestion).where(QAQuestion.worker_id == uid).order_by(QAQuestion.created_at))
    notifications = await _all(db, select(Notification).where(Notification.user_id == uid)
                                .order_by(Notification.created_at))
    names = await _usernames(db, [*following, *followers, *blocked, *(q.worker_id for q in asked),
                                  *(q.asker_id for q in received), *(n.actor_id for n in notifications)])

    def with_name(rows, id_field, name_field, drop=()):
        return [{**_row(r, drop), name_field: names.get(getattr(r, id_field))} for r in rows]

    return {
        "exported_at": utcnow().isoformat(),
        "about": "Everything Prologue stores about your account. Your password is stored only as a one-way hash "
                 "and is not included.",
        "account": _row(user),
        "profession": _row(profession) if profession else None,
        "sign_up_survey": _row(survey) if survey else None,
        "interests": sorted(interests),
        "posts": [{**_row(p), "task_details": details.get(p.id)} for p in posts],
        "stories": [_row(s) for s in await _all(db, select(Story).where(Story.user_id == uid))],
        "comments": [_row(c) for c in await _all(db, select(PostComment).where(PostComment.user_id == uid))],
        "comment_reactions": [_row(r) for r in await _all(db, select(CommentReaction).where(CommentReaction.user_id == uid))],
        "likes": [_row(r) for r in await _all(db, select(PostLike).where(PostLike.user_id == uid))],
        "saved_posts": [_row(r) for r in await _all(db, select(Bookmark).where(Bookmark.user_id == uid))],
        "reviews_written": [_row(r) for r in await _all(db, select(TaskReview).where(TaskReview.user_id == uid))],
        "questions_asked": with_name(asked, "worker_id", "asked_to"),
        "questions_received": with_name(received, "asker_id", "asked_by"),
        "question_upvotes": [_row(r) for r in await _all(db, select(QAUpvote).where(QAUpvote.user_id == uid))],
        "challenges": [_row(c) for c in await _all(db, select(WorkChallenge).where(WorkChallenge.worker_id == uid))],
        "ideas": [_row(s) for s in await _all(db, select(ChallengeSuggestion).where(ChallengeSuggestion.suggester_id == uid))],
        "idea_upvotes": [_row(r) for r in await _all(db, select(SuggestionUpvote).where(SuggestionUpvote.user_id == uid))],
        "following": sorted(names[i] for i in following if i in names),
        "followers": sorted(names[i] for i in followers if i in names),
        "blocked": sorted(names[i] for i in blocked if i in names),
        "reports_made": [_row(r, drop=("reporter_id", "target_user_id", "resolved_by_id"))
                         for r in await _all(db, select(Report).where(Report.reporter_id == uid))],
        "notifications": with_name(notifications, "actor_id", "from"),
    }
