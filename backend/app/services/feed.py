"""The "For you" ranking: what someone cares about, how fresh things are, and a share of discovery.

How much a viewer cares about each catalog profession (and its field) comes from:
  - the professions they picked as interests (a starting point that never fades),
  - what they did: likes, comments, saves, reviews, AMA questions and upvotes, follows,
  - what they opened: posts, case studies, profiles and profession pages (ViewEvent).
Actions and opens count less the older they are (half-life two weeks); only the last 90 days count.

A post's profession is its author's. Ranked posts are mixed so that about one in five comes from a field the
viewer hasn't shown interest in yet: an app about discovering professions should keep showing new ones.
"""
import math
from collections import defaultdict
from datetime import timedelta
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.professions import FIELD_OF
from app.core.time import utcnow
from app.models import (
    Bookmark, Follow, Post, PostComment, PostLike, ProfessionProfile, QAQuestion, QAUpvote, TaskReview, User,
    UserInterest,
)
from app.models.activity import ViewEvent

WINDOW = timedelta(days=90)
HALF_LIFE_DAYS = 14.0
DISCOVERY_EVERY = 5  # every 5th place goes to discovery
FIELD_SHARE = 0.4  # liking plumbers says a little about the rest of the trades too

INTEREST = 3.0
ACTIONS = {"like": 1.0, "comment": 2.0, "save": 3.0, "review": 3.0, "question": 3.0, "qa_upvote": 1.0, "follow": 4.0}
VIEWS = {"post": 0.5, "case_study": 1.0, "profile": 0.5, "profession": 1.5}
VIEW_KINDS = tuple(VIEWS)
FOLLOWED_BOOST = 3.0


class Affinity:
    """How much one viewer cares about each profession (slug) and field."""

    def __init__(self):
        self.slug: Dict[str, float] = defaultdict(float)
        self.field: Dict[str, float] = defaultdict(float)
        self.followed: set = set()

    def add(self, slug: Optional[str], field: Optional[str], weight: float) -> None:
        if slug in FIELD_OF:
            self.slug[slug] += weight
            field = FIELD_OF[slug]
        if field:
            self.field[field] += weight

    def of(self, domain: Tuple[Optional[str], Optional[str]]) -> float:
        slug, field = domain
        return self.slug.get(slug, 0.0) + FIELD_SHARE * self.field.get(field, 0.0)

    def knows(self, domain: Tuple[Optional[str], Optional[str]]) -> bool:
        """Whether the viewer has shown any interest in this profession's field."""
        slug, field = domain
        return self.slug.get(slug, 0.0) > 0 or self.field.get(field, 0.0) > 0


def _decay(when, now) -> float:
    age_days = max((now - when).total_seconds(), 0) / 86400 if when else 0.0
    return 0.5 ** (age_days / HALF_LIFE_DAYS)


async def domains_of(db: AsyncSession, user_ids: Iterable[str]) -> Dict[str, Tuple[Optional[str], Optional[str]]]:
    """user id -> (catalog profession, field) from their work profile; (None, None) if they don't work."""
    ids = list({i for i in user_ids if i})
    if not ids:
        return {}
    rows = (await db.execute(
        select(ProfessionProfile.user_id, ProfessionProfile.catalog_slug, ProfessionProfile.industry)
        .where(ProfessionProfile.user_id.in_(ids))
    )).all()
    out = {}
    for uid, slug, industry in rows:
        slug = slug if slug in FIELD_OF else None
        out[uid] = (slug, FIELD_OF.get(slug) or industry)
    return out


async def affinity_for(db: AsyncSession, viewer: User) -> Affinity:
    aff = Affinity()
    now = utcnow()
    since = now - WINDOW
    uid = viewer.id

    for (slug,) in (await db.execute(select(UserInterest.interest).where(UserInterest.user_id == uid))).all():
        aff.add(slug, None, INTEREST)

    # (author or worker id, when, weight) for each thing the viewer did
    acts: List[Tuple[str, object, float]] = []

    async def collect(stmt, weight):
        for other, when in (await db.execute(stmt)).all():
            if other != uid:
                acts.append((other, when, weight))

    await collect(select(Post.author_id, PostLike.created_at).join(Post, Post.id == PostLike.post_id)
                  .where(PostLike.user_id == uid, PostLike.created_at >= since), ACTIONS["like"])
    await collect(select(Post.author_id, PostComment.created_at).join(Post, Post.id == PostComment.post_id)
                  .where(PostComment.user_id == uid, PostComment.created_at >= since), ACTIONS["comment"])
    await collect(select(Post.author_id, Bookmark.created_at).join(Post, Post.id == Bookmark.post_id)
                  .where(Bookmark.user_id == uid, Bookmark.created_at >= since), ACTIONS["save"])
    await collect(select(Post.author_id, TaskReview.created_at).join(Post, Post.id == TaskReview.post_id)
                  .where(TaskReview.user_id == uid, TaskReview.created_at >= since), ACTIONS["review"])
    await collect(select(QAQuestion.worker_id, QAQuestion.created_at)
                  .where(QAQuestion.asker_id == uid, QAQuestion.created_at >= since), ACTIONS["question"])
    await collect(select(QAQuestion.worker_id, QAUpvote.created_at).join(QAQuestion, QAQuestion.id == QAUpvote.question_id)
                  .where(QAUpvote.user_id == uid, QAUpvote.created_at >= since), ACTIONS["qa_upvote"])
    follows = (await db.execute(select(Follow.followee_id, Follow.created_at).where(Follow.follower_id == uid))).all()
    aff.followed = {f for f, _ in follows}
    for other, when in follows:  # following someone says something even if it was long ago
        acts.append((other, max(when, since) if when else since, ACTIONS["follow"]))

    domains = await domains_of(db, (a for a, _, _ in acts))
    for other, when, weight in acts:
        slug, field = domains.get(other, (None, None))
        aff.add(slug, field, weight * _decay(when, now))

    views = (await db.execute(select(ViewEvent.kind, ViewEvent.slug, ViewEvent.field, ViewEvent.created_at)
                              .where(ViewEvent.user_id == uid, ViewEvent.created_at >= since))).all()
    for kind, slug, field, when in views:
        aff.add(slug, field, VIEWS.get(kind, 0.0) * _decay(when, now))
    return aff


def _freshness(when, now, hours: float) -> float:
    age_h = max((now - when).total_seconds(), 0) / 3600 if when else 1e6
    return 1.0 / (1.0 + age_h / hours) ** 1.5


def mix(familiar: List, discovery: List) -> List:
    """Every DISCOVERY_EVERY-th place from `discovery`, the rest from `familiar`; when one runs out, the other fills in."""
    out, f, d = [], 0, 0
    while f < len(familiar) or d < len(discovery):
        want_discovery = (len(out) + 1) % DISCOVERY_EVERY == 0
        if (want_discovery and d < len(discovery)) or f >= len(familiar):
            out.append(discovery[d]); d += 1
        else:
            out.append(familiar[f]); f += 1
    return out


def rank(items: Sequence, aff: Affinity, domain_of, owner_of, created_of, popularity_of, me: str, hours: float) -> List:
    """Familiar items by care × freshness × popularity; discovery items by freshness × popularity; then mixed."""
    now = utcnow()
    familiar, discovery = [], []
    for item in items:
        owner = owner_of(item)
        domain = domain_of(owner)
        fresh = _freshness(created_of(item), now, hours)
        pop = 1.0 + 0.15 * math.log1p(max(popularity_of(item), 0))
        followed = owner in aff.followed or owner == me
        if followed or aff.knows(domain):
            care = aff.of(domain) + (FOLLOWED_BOOST if followed else 0.0)
            familiar.append(((1.0 + care) * fresh * pop, item))
        else:
            discovery.append((fresh * pop, item))
    familiar.sort(key=lambda x: x[0], reverse=True)
    discovery.sort(key=lambda x: x[0], reverse=True)
    return mix([i for _, i in familiar], [i for _, i in discovery])


async def rank_posts(db: AsyncSession, viewer: User, posts: Sequence[Post]) -> List[Post]:
    aff = await affinity_for(db, viewer)
    domains = await domains_of(db, (p.author_id for p in posts))
    return rank(
        posts, aff,
        domain_of=lambda uid: domains.get(uid, (None, None)),
        owner_of=lambda p: p.author_id,
        created_of=lambda p: p.created_at,
        popularity_of=lambda p: (p.likes_count or 0) + 2 * (p.comments_count or 0),
        me=viewer.id, hours=36.0,
    )


async def rank_questions(db: AsyncSession, viewer: User, questions: Sequence[QAQuestion]) -> List[QAQuestion]:
    aff = await affinity_for(db, viewer)
    domains = await domains_of(db, (q.worker_id for q in questions))
    return rank(
        questions, aff,
        domain_of=lambda uid: domains.get(uid, (None, None)),
        owner_of=lambda q: q.worker_id,
        created_of=lambda q: q.created_at,
        popularity_of=lambda q: q.upvotes_count or 0,
        me=viewer.id, hours=24.0 * 7,
    )


async def record_view(db: AsyncSession, viewer: User, kind: str, target: str) -> bool:
    """Notes that `viewer` opened something in a profession. Returns False when there is nothing to learn
    (unknown target, or a person without a profession). Keeps the last 90 days only."""
    slug = field = None
    if kind == "profession":
        if target not in FIELD_OF:
            return False
        slug = target
    elif kind in ("post", "case_study"):
        author = (await db.execute(select(Post.author_id).where(Post.id == target))).scalar_one_or_none()
        if author is None or author == viewer.id:
            return False
        slug, field = (await domains_of(db, [author])).get(author, (None, None))
    elif kind == "profile":
        uid = (await db.execute(select(User.id).where(User.username == target.lower()))).scalar_one_or_none()
        if uid is None or uid == viewer.id:
            return False
        slug, field = (await domains_of(db, [uid])).get(uid, (None, None))
    if not slug and not field:
        return False
    db.add(ViewEvent(user_id=viewer.id, kind=kind, slug=slug, field=field or FIELD_OF.get(slug)))
    await db.execute(delete(ViewEvent).where(ViewEvent.user_id == viewer.id, ViewEvent.created_at < utcnow() - WINDOW))
    await db.commit()
    return True
