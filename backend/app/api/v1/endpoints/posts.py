from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_user
from app.api.serializers import bookmarked_ids_for, liked_ids_for, post_out
from app.db.session import get_db
from app.models import Bookmark, Follow, Post, PostLike, TaskDetails, User
from app.schemas.post import PostCreate, PostResponse, PostType

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
