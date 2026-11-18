"""Deleting an account and everything it owns, keeping everyone else's counts correct.

Everything is removed with explicit statements (not ON DELETE CASCADE), so it behaves the same on
SQLite, which doesn't enforce foreign keys by default, and on Postgres.
"""
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Block, Bookmark, ChallengeSuggestion, CommentReaction, Follow, FollowRequest, Notification, Post, PostComment, PostLike, Report,
    ProfessionProfile, QAQuestion, QAUpvote, Story, SuggestionUpvote, TaskDetails, TaskReview, User, UserInterest,
    UserSurvey, WorkChallenge,
)


async def _recount_reviews(db: AsyncSession, post_ids) -> None:
    for pid in post_ids:
        avg, count = (
            await db.execute(
                select(func.avg((TaskReview.clarity_score + TaskReview.accuracy_score) / 2.0), func.count())
                .where(TaskReview.post_id == pid)
            )
        ).one()
        await db.execute(
            update(Post).where(Post.id == pid).values(
                reviews_count=count, rating=round(float(avg), 1) if avg is not None else 5.0,
            )
        )


async def _recount_comments(db: AsyncSession, post_ids) -> None:
    for pid in post_ids:
        count = (
            await db.execute(select(func.count()).select_from(PostComment).where(PostComment.post_id == pid))
        ).scalar_one()
        await db.execute(update(Post).where(Post.id == pid).values(comments_count=count))


async def delete_account(db: AsyncSession, user_id: str) -> None:
    """Deletes the user and all their content in the current transaction (the caller commits)."""
    my_posts = select(Post.id).where(Post.author_id == user_id)
    my_challenges = select(WorkChallenge.id).where(WorkChallenge.worker_id == user_id)
    my_suggestions = select(ChallengeSuggestion.id).where(ChallengeSuggestion.suggester_id == user_id)
    questions_involving_me = select(QAQuestion.id).where(
        (QAQuestion.asker_id == user_id) | (QAQuestion.worker_id == user_id)
    )

    # 0. Notifications to/from this user or about anything that is about to go, and emoji reactions by
    #    this user or on comments that are about to go.
    doomed_comments = select(PostComment.id).where(
        (PostComment.user_id == user_id) | PostComment.post_id.in_(my_posts)
    )
    await db.execute(
        delete(Notification).where(
            (Notification.user_id == user_id) | (Notification.actor_id == user_id)
            | Notification.post_id.in_(my_posts) | Notification.comment_id.in_(doomed_comments)
            | Notification.question_id.in_(questions_involving_me) | Notification.challenge_id.in_(my_challenges)
            | Notification.suggestion_id.in_(my_suggestions)
        )
    )
    await db.execute(
        delete(CommentReaction).where(
            (CommentReaction.user_id == user_id) | CommentReaction.comment_id.in_(doomed_comments)
        )
    )

    # 1. Take back this user's likes and upvotes on other people's content, so their counters stay right.
    await db.execute(
        update(Post).where(Post.id.in_(select(PostLike.post_id).where(PostLike.user_id == user_id)))
        .values(likes_count=Post.likes_count - 1)
    )
    await db.execute(
        update(QAQuestion).where(QAQuestion.id.in_(select(QAUpvote.question_id).where(QAUpvote.user_id == user_id)))
        .values(upvotes_count=QAQuestion.upvotes_count - 1)
    )
    await db.execute(
        update(ChallengeSuggestion)
        .where(ChallengeSuggestion.id.in_(select(SuggestionUpvote.suggestion_id).where(SuggestionUpvote.user_id == user_id)))
        .values(upvotes_count=ChallengeSuggestion.upvotes_count - 1)
    )
    for model in (PostLike, QAUpvote, SuggestionUpvote, Bookmark):
        await db.execute(delete(model).where(model.user_id == user_id))
    await db.execute(delete(Follow).where((Follow.follower_id == user_id) | (Follow.followee_id == user_id)))
    await db.execute(delete(Block).where((Block.blocker_id == user_id) | (Block.blocked_id == user_id)))
    await db.execute(delete(FollowRequest).where(
        (FollowRequest.requester_id == user_id) | (FollowRequest.target_id == user_id)))
    # Reports by or about this person go; reports they resolved as a moderator stay, without their name.
    await db.execute(delete(Report).where((Report.reporter_id == user_id) | (Report.target_user_id == user_id)))
    await db.execute(update(Report).where(Report.resolved_by_id == user_id).values(resolved_by_id=None))

    # 2. Reviews and comments on other people's posts: remove, then recount those posts.
    reviewed = set((await db.execute(select(TaskReview.post_id).where(TaskReview.user_id == user_id))).scalars())
    await db.execute(delete(TaskReview).where(TaskReview.user_id == user_id))
    await _recount_reviews(db, reviewed)
    commented = set((await db.execute(select(PostComment.post_id).where(PostComment.user_id == user_id))).scalars())
    await db.execute(delete(PostComment).where(PostComment.user_id == user_id))
    await _recount_comments(db, commented)

    # 3. Ideas on other people's challenges. Removing an accepted one reopens that challenge.
    await db.execute(
        update(WorkChallenge)
        .where(WorkChallenge.id.in_(
            select(ChallengeSuggestion.challenge_id).where(
                ChallengeSuggestion.suggester_id == user_id, ChallengeSuggestion.is_accepted_by_worker.is_(True)
            )
        ))
        .values(is_solved=False)
    )
    await db.execute(delete(SuggestionUpvote).where(SuggestionUpvote.suggestion_id.in_(my_suggestions)))
    await db.execute(delete(ChallengeSuggestion).where(ChallengeSuggestion.suggester_id == user_id))

    # 4. Questions they asked or were asked.
    await db.execute(delete(QAUpvote).where(QAUpvote.question_id.in_(questions_involving_me)))
    await db.execute(
        delete(QAQuestion).where((QAQuestion.asker_id == user_id) | (QAQuestion.worker_id == user_id))
    )

    # 5. Their challenges, with everyone's ideas on them.
    chal_suggestions = select(ChallengeSuggestion.id).where(ChallengeSuggestion.challenge_id.in_(my_challenges))
    await db.execute(delete(SuggestionUpvote).where(SuggestionUpvote.suggestion_id.in_(chal_suggestions)))
    await db.execute(delete(ChallengeSuggestion).where(ChallengeSuggestion.challenge_id.in_(my_challenges)))
    await db.execute(delete(WorkChallenge).where(WorkChallenge.worker_id == user_id))

    # 6. Their posts, with everything attached to them, and their stories.
    for model in (PostLike, Bookmark, TaskReview, PostComment, TaskDetails):
        await db.execute(delete(model).where(model.post_id.in_(my_posts)))
    await db.execute(delete(Post).where(Post.author_id == user_id))
    await db.execute(delete(Story).where(Story.user_id == user_id))

    # 7. The account itself.
    for model in (ProfessionProfile, UserSurvey, UserInterest):
        await db.execute(delete(model).where(model.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))
