"""Helpers that turn ORM objects into the dict shapes used by the response schemas."""
from typing import Iterable, Optional, Set

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Bookmark, ChallengeSuggestion, Follow, Post, PostLike, QAQuestion, QAUpvote, Story, SuggestionUpvote,
    TaskReview, User, UserInterest, UserSurvey, WorkChallenge,
)
from app.schemas.user import SurveyResponse


def _prof_title(user: User) -> Optional[str]:
    return user.profession.title if user.profession else None


async def user_public_out(db: AsyncSession, user: User, viewer: Optional[User] = None) -> dict:
    posts_count = (
        await db.execute(select(func.count()).select_from(Post).where(Post.author_id == user.id))
    ).scalar_one()
    followers_count = (
        await db.execute(select(func.count()).select_from(Follow).where(Follow.followee_id == user.id))
    ).scalar_one()
    following_count = (
        await db.execute(select(func.count()).select_from(Follow).where(Follow.follower_id == user.id))
    ).scalar_one()
    is_following = False
    if viewer is not None and viewer.id != user.id:
        is_following = (
            await db.execute(
                select(Follow.follower_id).where(Follow.follower_id == viewer.id, Follow.followee_id == user.id)
            )
        ).first() is not None
    avg_rating = (
        await db.execute(
            select(func.avg(Post.rating)).where(Post.author_id == user.id, Post.reviews_count > 0)
        )
    ).scalar_one()
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "profession": user.profession,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": is_following,
        "posts_count": posts_count,
        "rating": round(float(avg_rating), 1) if avg_rating is not None else None,
    }


async def user_me_out(db: AsyncSession, user: User) -> dict:
    data = await user_public_out(db, user)
    survey = (await db.execute(select(UserSurvey).where(UserSurvey.user_id == user.id))).scalar_one_or_none()
    interests = (
        await db.execute(select(UserInterest.interest).where(UserInterest.user_id == user.id))
    ).scalars().all()
    data["email"] = user.email
    data["survey"] = SurveyResponse.model_validate(survey) if survey else None
    data["interests"] = sorted(interests)
    return data


def post_out(post: Post, liked_post_ids: Set[str], bookmarked_post_ids: Set[str] = frozenset()) -> dict:
    author = post.author
    td = post.task_details
    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_username": author.username,
        "author_full_name": author.full_name,
        "author_avatar_url": author.avatar_url,
        "author_profession_title": _prof_title(author),
        "author_industry": author.profession.industry if author.profession else None,
        "is_author_verified": bool(author.profession and author.profession.is_verified_pro),
        "title": post.title,
        "caption": post.caption,
        "post_type": post.post_type,
        "media": post.media or [],
        "tags": post.tags or [],
        "likes_count": post.likes_count,
        "comments_count": post.comments_count,
        "rating": post.rating if post.reviews_count else None,
        "reviews_count": post.reviews_count or 0,
        "is_liked_by_me": post.id in liked_post_ids,
        "is_bookmarked_by_me": post.id in bookmarked_post_ids,
        "task_details": td,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
    }


async def liked_ids_for(db: AsyncSession, user: Optional[User], posts: list) -> Set[str]:
    if user is None or not posts:
        return set()
    rows = await db.execute(
        select(PostLike.post_id).where(PostLike.user_id == user.id, PostLike.post_id.in_([p.id for p in posts]))
    )
    return set(rows.scalars().all())


async def bookmarked_ids_for(db: AsyncSession, user: Optional[User], posts: list) -> Set[str]:
    if user is None or not posts:
        return set()
    rows = await db.execute(
        select(Bookmark.post_id).where(Bookmark.user_id == user.id, Bookmark.post_id.in_([p.id for p in posts]))
    )
    return set(rows.scalars().all())


async def upvoted_question_ids(db: AsyncSession, user: Optional[User], questions: Iterable[QAQuestion]) -> Set[str]:
    ids = [q.id for q in questions]
    if user is None or not ids:
        return set()
    rows = await db.execute(
        select(QAUpvote.question_id).where(QAUpvote.user_id == user.id, QAUpvote.question_id.in_(ids))
    )
    return set(rows.scalars().all())


async def upvoted_suggestion_ids(
    db: AsyncSession, user: Optional[User], challenges: Iterable[WorkChallenge]
) -> Set[str]:
    ids = [s.id for c in challenges for s in c.suggestions]
    if user is None or not ids:
        return set()
    rows = await db.execute(
        select(SuggestionUpvote.suggestion_id).where(
            SuggestionUpvote.user_id == user.id, SuggestionUpvote.suggestion_id.in_(ids)
        )
    )
    return set(rows.scalars().all())


def story_out(story: Story) -> dict:
    a = story.author
    return {
        "id": story.id,
        "user_id": story.user_id,
        "author_username": a.username,
        "author_full_name": a.full_name,
        "author_avatar_url": a.avatar_url,
        "author_profession_title": _prof_title(a),
        "media_url": story.media_url,
        "media_type": story.media_type,
        "caption": story.caption,
        "profession_tag": story.profession_tag,
        "created_at": story.created_at,
        "expires_at": story.expires_at,
        "is_pinned_highlight": bool(story.is_pinned_highlight),
        "highlight_collection_name": story.highlight_collection_name,
        "views_count": story.views_count or 0,
    }


def review_out(r: TaskReview) -> dict:
    return {
        "id": r.id,
        "post_id": r.post_id,
        "user_id": r.user_id,
        "username": r.user.username,
        "user_avatar_url": r.user.avatar_url,
        "is_peer_verified": bool(r.is_peer_verified),
        "reviewer_profession": r.reviewer_profession,
        "clarity_score": r.clarity_score,
        "accuracy_score": r.accuracy_score,
        "feedback_text": r.feedback_text,
        "created_at": r.created_at,
    }


def question_out(q: QAQuestion, upvoted_ids: Set[str] = frozenset()) -> dict:
    w = q.worker
    return {
        "id": q.id,
        "worker_id": q.worker_id,
        "worker_username": w.username,
        "worker_full_name": w.full_name,
        "worker_profession_title": _prof_title(w),
        "worker_avatar_url": w.avatar_url,
        "asker_id": q.asker_id,
        "asker_username": q.asker.username,
        "asker_full_name": q.asker.full_name,
        "asker_avatar_url": q.asker.avatar_url,
        "question_text": q.question_text,
        "topic_tag": q.topic_tag,
        "answer_text": q.answer_text,
        "video_response_url": q.video_response_url,
        "is_answered": bool(q.is_answered),
        "upvotes_count": q.upvotes_count or 0,
        "upvoted_by_me": q.id in upvoted_ids,
        "created_at": q.created_at,
        "answered_at": q.answered_at,
    }


def suggestion_out(s: ChallengeSuggestion, upvoted_ids: Set[str] = frozenset()) -> dict:
    u = s.suggester
    return {
        "id": s.id,
        "challenge_id": s.challenge_id,
        "suggester_id": s.suggester_id,
        "suggester_username": u.username,
        "suggester_profession": _prof_title(u),
        "suggestion_text": s.suggestion_text,
        "suggested_tool_or_reference": s.suggested_tool_or_reference,
        "upvotes_count": s.upvotes_count or 0,
        "upvoted_by_me": s.id in upvoted_ids,
        "is_accepted_by_worker": bool(s.is_accepted_by_worker),
        "created_at": s.created_at,
    }


def challenge_out(c: WorkChallenge, upvoted_suggestion_ids: Set[str] = frozenset()) -> dict:
    w = c.worker
    return {
        "id": c.id,
        "worker_id": c.worker_id,
        "worker_username": w.username,
        "worker_full_name": w.full_name,
        "worker_profession_title": _prof_title(w) or "Professional",
        "worker_avatar_url": w.avatar_url,
        "title": c.title,
        "scenario_description": c.scenario_description,
        "profession_category": c.profession_category,
        "media_url": c.media_url,
        "urgency_level": c.urgency_level,
        "is_solved": bool(c.is_solved),
        "suggestions": [suggestion_out(s, upvoted_suggestion_ids) for s in c.suggestions],
        "created_at": c.created_at,
    }
