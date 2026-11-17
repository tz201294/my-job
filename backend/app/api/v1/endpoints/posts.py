from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_user
from app.api.serializers import bookmarked_ids_for, comment_out, liked_ids_for, post_out, reactions_for
from app.core.time import utcnow
from app.db.session import get_db
from app.models import (
    Bookmark, CommentReaction, Follow, Post, PostComment, PostLike, TaskDetails, TaskReview, User,
)
from app.schemas.comment import (
    CommentCreate, CommentPage, CommentResponse, CommentUpdate, ReactionIn, ReactionState,
)
from app.services.notifications import forget, notify, withdraw
from app.schemas.post import PostCreate, PostResponse, PostType, PostUpdate

router = APIRouter()


@router.get("/feed", response_model=List[PostResponse])
async def get_feed(
    post_type: Optional[PostType] = None,
    profession_category: Optional[str] = None,
    author_username: Optional[str] = None,
    following: bool = False,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """Main feed endpoint with optional filters by post type, profession category and author.

    `following=true` limits the feed to people the signed-in user follows (plus their own posts).
    """
    if following and user is None:
        raise HTTPException(status_code=401, detail="Sign in to see your following feed")
    stmt = select(Post).order_by(Post.created_at.desc()).limit(limit).offset(offset)
    if following:
        followed = select(Follow.followee_id).where(Follow.follower_id == user.id)
        stmt = stmt.where(or_(Post.author_id.in_(followed), Post.author_id == user.id))
    if author_username:
        stmt = stmt.join(User, User.id == Post.author_id).where(User.username == author_username.lower())
    if post_type:
        stmt = stmt.where(Post.post_type == post_type.value)
    if profession_category:
        stmt = stmt.join(TaskDetails, TaskDetails.post_id == Post.id).where(
            func.lower(TaskDetails.category) == profession_category.lower()
        )
    posts = (await db.execute(stmt)).scalars().all()
    liked = await liked_ids_for(db, user, posts)
    saved = await bookmarked_ids_for(db, user, posts)
    return [post_out(p, liked, saved) for p in posts]


@router.get("/bookmarks", response_model=List[PostResponse])
async def list_bookmarks(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Posts the signed-in user saved, most recently saved first."""
    posts = (
        await db.execute(
            select(Post)
            .join(Bookmark, Bookmark.post_id == Post.id)
            .where(Bookmark.user_id == user.id)
            .order_by(Bookmark.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()
    liked = await liked_ids_for(db, user, posts)
    return [post_out(p, liked, {p.id for p in posts}) for p in posts]


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_in: PostCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Creates a new post or task walkthrough authored by the signed-in user."""
    post = Post(
        author_id=user.id,
        title=post_in.title,
        caption=post_in.caption,
        post_type=post_in.post_type.value,
        media=[m.model_dump() for m in post_in.media],
        tags=post_in.tags,
    )
    if post_in.task_details:
        td = post_in.task_details.model_dump(mode="json")
        post.task_details = TaskDetails(**td)
    db.add(post)
    await db.commit()

    post = (await db.execute(select(Post).where(Post.id == post.id))).scalar_one()
    return post_out(post, set(), set())


@router.get("/{post_id}", response_model=PostResponse)
async def get_post_by_id(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    liked = await liked_ids_for(db, user, [post])
    saved = await bookmarked_ids_for(db, user, [post])
    return post_out(post, liked, saved)


async def _own_post(db: AsyncSession, user: User, post_id: str) -> Post:
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="You can only change your own posts")
    return post


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post_in: PostUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The author edits their post. Only the fields sent are changed."""
    post = await _own_post(db, user, post_id)
    changes = post_in.changes()

    for field in ("title", "caption", "tags"):
        if field in changes:
            setattr(post, field, changes[field])
    if "media" in changes:
        post.media = [m.model_dump() for m in post_in.media]
    if "task_details" in changes:
        if post_in.task_details is None:
            post.task_details = None  # delete-orphan removes the row
        else:
            td = post_in.task_details.model_dump(mode="json")
            if post.task_details is None:
                post.task_details = TaskDetails(**td)
            else:
                for k, v in td.items():
                    setattr(post.task_details, k, v)
    await db.commit()

    db.expire_all()
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one()
    liked = await liked_ids_for(db, user, [post])
    saved = await bookmarked_ids_for(db, user, [post])
    return post_out(post, liked, saved)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The author deletes their post, with its likes, saves and reviews."""
    post = await _own_post(db, user, post_id)
    # Removed explicitly so nothing is left behind on databases that don't enforce ON DELETE CASCADE (SQLite).
    post_comments = select(PostComment.id).where(PostComment.post_id == post_id)
    await db.execute(delete(CommentReaction).where(CommentReaction.comment_id.in_(post_comments)))
    await forget(db, post_id=post_id)
    for model in (PostLike, Bookmark, TaskReview, PostComment):
        await db.execute(delete(model).where(model.post_id == post_id))
    await db.delete(post)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- comments ----------

async def _post_or_404(db: AsyncSession, post_id: str) -> Post:
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


async def _comment_or_404(db: AsyncSession, post_id: str, comment_id: str) -> PostComment:
    c = (
        await db.execute(select(PostComment).where(PostComment.id == comment_id, PostComment.post_id == post_id))
    ).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    return c


async def _sync_comments_count(db: AsyncSession, post_id: str) -> int:
    """Recount instead of incrementing, so the stored number can't drift from the real rows."""
    count = (
        await db.execute(select(func.count()).select_from(PostComment).where(PostComment.post_id == post_id))
    ).scalar_one()
    await db.execute(update(Post).where(Post.id == post_id).values(comments_count=count))
    return count


@router.get("/{post_id}/comments", response_model=CommentPage)
async def list_comments(
    post_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """Comments on a post, oldest first, with emoji reactions. Public."""
    await _post_or_404(db, post_id)
    total = (
        await db.execute(select(func.count()).select_from(PostComment).where(PostComment.post_id == post_id))
    ).scalar_one()
    rows = (
        await db.execute(
            select(PostComment)
            .where(PostComment.post_id == post_id)
            .order_by(PostComment.created_at, PostComment.id)
            .limit(limit)
            .offset(offset)
        )
    ).scalars().all()
    counts, mine = await reactions_for(db, [c.id for c in rows], user)
    return {"total": total, "comments": [comment_out(c, counts.get(c.id), mine.get(c.id)) for c in rows]}


@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    post_id: str,
    c_in: CommentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    post = await _post_or_404(db, post_id)
    comment = PostComment(post_id=post_id, user_id=user.id, body=c_in.body)
    db.add(comment)
    await db.flush()
    await _sync_comments_count(db, post_id)
    await notify(db, user_id=post.author_id, actor_id=user.id, type="comment", post_id=post_id,
                 comment_id=comment.id, snippet=c_in.body)
    await db.commit()
    comment = await _comment_or_404(db, post_id, comment.id)
    return comment_out(comment)


@router.patch("/{post_id}/comments/{comment_id}", response_model=CommentResponse)
async def edit_comment(
    post_id: str,
    comment_id: str,
    c_in: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The author edits their comment."""
    comment = await _comment_or_404(db, post_id, comment_id)
    if comment.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    comment.body = c_in.body
    comment.updated_at = utcnow()
    await db.commit()
    counts, mine = await reactions_for(db, [comment.id], user)
    return comment_out(comment, counts.get(comment.id), mine.get(comment.id))


@router.delete("/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    post_id: str,
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The comment's author, or the post's author (moderating their own post), deletes a comment."""
    comment = await _comment_or_404(db, post_id, comment_id)
    post = await _post_or_404(db, post_id)
    if user.id not in (comment.user_id, post.author_id):
        raise HTTPException(status_code=403, detail="Only the commenter or the post's author can delete this comment")
    await db.execute(delete(CommentReaction).where(CommentReaction.comment_id == comment_id))
    await forget(db, comment_id=comment_id)
    await db.delete(comment)
    await db.flush()
    await _sync_comments_count(db, post_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _reaction_state(db: AsyncSession, comment_id: str, user: User) -> dict:
    counts, mine = await reactions_for(db, [comment_id], user)
    return {"comment_id": comment_id, "reactions": counts.get(comment_id, {}), "my_reaction": mine.get(comment_id)}


@router.put("/{post_id}/comments/{comment_id}/reaction", response_model=ReactionState)
async def react_to_comment(
    post_id: str,
    comment_id: str,
    body: ReactionIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Sets your emoji reaction on a comment, replacing any earlier one (one reaction per person)."""
    comment = await _comment_or_404(db, post_id, comment_id)
    existing = (
        await db.execute(
            select(CommentReaction).where(CommentReaction.comment_id == comment_id, CommentReaction.user_id == user.id)
        )
    ).scalar_one_or_none()
    if existing:
        existing.emoji = body.emoji
    else:
        db.add(CommentReaction(comment_id=comment_id, user_id=user.id, emoji=body.emoji))
    await notify(db, user_id=comment.user_id, actor_id=user.id, type="reaction", post_id=post_id,
                 comment_id=comment_id, snippet=f"{body.emoji} {comment.body}", collapse=True)
    try:
        await db.commit()
    except IntegrityError:  # two clicks at once; the first one won
        await db.rollback()
    return await _reaction_state(db, comment_id, user)


@router.delete("/{post_id}/comments/{comment_id}/reaction", response_model=ReactionState)
async def remove_reaction(
    post_id: str,
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Removes your reaction from a comment. Idempotent."""
    await _comment_or_404(db, post_id, comment_id)
    await db.execute(
        delete(CommentReaction).where(CommentReaction.comment_id == comment_id, CommentReaction.user_id == user.id)
    )
    await withdraw(db, actor_id=user.id, type="reaction", comment_id=comment_id)
    await db.commit()
    return await _reaction_state(db, comment_id, user)


@router.post("/{post_id}/like")
async def toggle_like(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    post = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = (
        await db.execute(select(PostLike).where(PostLike.user_id == user.id, PostLike.post_id == post_id))
    ).scalar_one_or_none()

    if existing:
        await db.execute(delete(PostLike).where(PostLike.user_id == user.id, PostLike.post_id == post_id))
        delta, is_liked = -1, False
    else:
        db.add(PostLike(user_id=user.id, post_id=post_id))
        delta, is_liked = 1, True

    try:
        await db.flush()
    except IntegrityError:  # concurrent double-click: the like already exists
        await db.rollback()
        raise HTTPException(status_code=409, detail="Like already recorded")

    # Atomic counter update (avoids lost updates under concurrency)
    await db.execute(update(Post).where(Post.id == post_id).values(likes_count=Post.likes_count + delta))
    await db.commit()
    likes_count = (await db.execute(select(Post.likes_count).where(Post.id == post_id))).scalar_one()
    return {"post_id": post_id, "is_liked": is_liked, "likes_count": likes_count}


@router.post("/{post_id}/bookmark")
async def toggle_bookmark(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Saves the post for the signed-in user, or removes it if already saved."""
    if (await db.execute(select(Post.id).where(Post.id == post_id))).first() is None:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = (
        await db.execute(select(Bookmark).where(Bookmark.user_id == user.id, Bookmark.post_id == post_id))
    ).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        is_bookmarked = False
    else:
        db.add(Bookmark(user_id=user.id, post_id=post_id))
        is_bookmarked = True
    try:
        await db.commit()
    except IntegrityError:  # concurrent double-click: already saved
        await db.rollback()
        is_bookmarked = True
    return {"post_id": post_id, "is_bookmarked": is_bookmarked}
