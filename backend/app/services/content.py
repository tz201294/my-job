"""Removing content together with everything attached to it. Used when the owner deletes something and when a
moderator removes it, so both leave the database in the same state. Each function works in the caller's
transaction (the caller commits).

Everything is removed with explicit statements (not ON DELETE CASCADE), so it behaves the same on SQLite, which
doesn't enforce foreign keys by default, and on Postgres.
"""
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Bookmark, ChallengeSuggestion, CommentReaction, Post, PostComment, PostLike, QAQuestion, QAUpvote,
    SuggestionUpvote, TaskReview, WorkChallenge,
)
from app.services.notifications import forget


async def sync_comments_count(db: AsyncSession, post_id: str) -> int:
    """Recount instead of incrementing, so the stored number can't drift from the real rows."""
    count = (
        await db.execute(select(func.count()).select_from(PostComment).where(PostComment.post_id == post_id))
    ).scalar_one()
    await db.execute(update(Post).where(Post.id == post_id).values(comments_count=count))
    return count


async def remove_post(db: AsyncSession, post: Post) -> None:
    """A post, with its comments (and their reactions), likes, saves, reviews and notifications."""
    post_comments = select(PostComment.id).where(PostComment.post_id == post.id)
    await db.execute(delete(CommentReaction).where(CommentReaction.comment_id.in_(post_comments)))
    await forget(db, post_id=post.id)
    for model in (PostLike, Bookmark, TaskReview, PostComment):
        await db.execute(delete(model).where(model.post_id == post.id))
    await db.delete(post)


async def remove_comment(db: AsyncSession, comment: PostComment) -> None:
    """A comment, with its reactions and notifications; the post's comment count follows."""
    post_id = comment.post_id
    await db.execute(delete(CommentReaction).where(CommentReaction.comment_id == comment.id))
    await forget(db, comment_id=comment.id)
    await db.delete(comment)
    await db.flush()
    await sync_comments_count(db, post_id)


async def remove_question(db: AsyncSession, question: QAQuestion) -> None:
    """A Q&A question (and its answer), with upvotes and notifications."""
    await db.execute(delete(QAUpvote).where(QAUpvote.question_id == question.id))
    await forget(db, question_id=question.id)
    await db.delete(question)


async def remove_challenge(db: AsyncSession, challenge: WorkChallenge) -> None:
    """A live work challenge with all its ideas, their upvotes and notifications."""
    suggestion_ids = select(ChallengeSuggestion.id).where(ChallengeSuggestion.challenge_id == challenge.id)
    await db.execute(delete(SuggestionUpvote).where(SuggestionUpvote.suggestion_id.in_(suggestion_ids)))
    await forget(db, suggestion_id=suggestion_ids)
    await forget(db, challenge_id=challenge.id)
    await db.delete(challenge)  # suggestions go with it (delete-orphan)


async def remove_suggestion(db: AsyncSession, suggestion: ChallengeSuggestion) -> None:
    """An idea on a challenge. Removing the accepted one reopens the challenge."""
    if suggestion.is_accepted_by_worker:
        challenge = (
            await db.execute(select(WorkChallenge).where(WorkChallenge.id == suggestion.challenge_id))
        ).scalar_one()
        challenge.is_solved = False
    await db.execute(delete(SuggestionUpvote).where(SuggestionUpvote.suggestion_id == suggestion.id))
    await forget(db, suggestion_id=suggestion.id)
    await db.delete(suggestion)
