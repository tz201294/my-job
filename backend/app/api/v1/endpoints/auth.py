from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_user
from app.api.serializers import user_me_out, user_public_out
from app.core.security import create_access_token, hash_password, verify_password
from app.core.taxonomy import INDUSTRY_OPTIONS, INTEREST_OPTIONS
from app.db.session import get_db
from app.models import Follow, Post, ProfessionProfile, User, UserInterest, UserSurvey
from app.schemas.user import (
    EducationLevel, Gender, NonWorkingStatus, Token, UserCreate, UserLogin, UserMeResponse, UserResponse,
)

router = APIRouter()

# Hash of a throwaway password, verified when the account doesn't exist so that
# response time does not reveal whether a username is registered.
_DUMMY_HASH = hash_password("not-a-real-password")


@router.get("/signup-options")
async def get_signup_options():
    """Choices shown in the sign-up form (industries, interests, gender, ...)."""
    return {
        "industries": INDUSTRY_OPTIONS,
        "interests": INTEREST_OPTIONS,
        "genders": [g.value for g in Gender],
        "non_working_statuses": [s.value for s in NonWorkingStatus],
        "education_levels": [e.value for e in EducationLevel],
    }


@router.get("/professionals", response_model=List[UserResponse])
async def list_professionals(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    viewer: Optional[User] = Depends(get_optional_user),
):
    """Users who said they work, so others can ask them questions."""
    users = (
        await db.execute(
            select(User)
            .join(ProfessionProfile, ProfessionProfile.user_id == User.id)
            .where(User.is_active.is_(True))
            .order_by(ProfessionProfile.is_verified_pro.desc(), User.created_at)
            .limit(limit)
        )
    ).scalars().all()
    return [await user_public_out(db, u, viewer) for u in users]


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Creates an account, stores the onboarding survey, and signs the user in."""
    email = user_in.email.lower() if user_in.email else None

    clauses = [User.username == user_in.username]
    if email:
        clauses.append(func.lower(User.email) == email)
    existing = (await db.execute(select(User).where(or_(*clauses)))).scalars().first()
    if existing:
        if existing.username == user_in.username:
            raise HTTPException(status_code=409, detail="Username already taken")
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        username=user_in.username,
        email=email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name or user_in.username,
    )
    user.survey = UserSurvey(
        works=user_in.works,
        non_working_status=user_in.non_working_status.value if user_in.non_working_status else None,
        gender=user_in.gender.value,
        age=user_in.age,
        country=user_in.country,
        education_level=user_in.education_level.value if user_in.education_level else None,
        data_consent=user_in.data_consent,
    )
    user.interests = [UserInterest(interest=i) for i in user_in.interests]
    if user_in.profession:
        p = user_in.profession
        user.profession = ProfessionProfile(
            industry=p.industry,
            title=p.title,
            specialization=p.specialization,
            years_of_experience=p.years_of_experience,
            company_or_freelance=p.company_or_freelance,
            is_verified_pro=False,
            key_tools=[],
        )

    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Username or email already registered")

    # Re-load so relationships are populated for the response.
    user = (await db.execute(select(User).where(User.id == user.id))).scalar_one()
    return Token(access_token=create_access_token(user.id), user=await user_me_out(db, user))


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    ident = credentials.username_or_email.strip().lower()
    user = (
        await db.execute(select(User).where(or_(User.username == ident, func.lower(User.email) == ident)))
    ).scalars().first()

    if user is None:
        verify_password(credentials.password, _DUMMY_HASH)
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not verify_password(credentials.password, user.hashed_password) or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return Token(access_token=create_access_token(user.id), user=await user_me_out(db, user))


@router.get("/me", response_model=UserMeResponse)
async def read_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await user_me_out(db, current_user)


async def _get_user_or_404(db: AsyncSession, username: str) -> User:
    user = (await db.execute(select(User).where(User.username == username.lower()))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/{username}", response_model=UserResponse)
async def get_user_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
    viewer: Optional[User] = Depends(get_optional_user),
):
    user = await _get_user_or_404(db, username)
    return await user_public_out(db, user, viewer)


async def _follow_state(db: AsyncSession, target: User, is_following: bool) -> dict:
    followers = (
        await db.execute(select(func.count()).select_from(Follow).where(Follow.followee_id == target.id))
    ).scalar_one()
    return {"username": target.username, "is_following": is_following, "followers_count": followers}


@router.post("/users/{username}/follow")
async def follow_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Follow a user. Idempotent: following someone you already follow is a no-op."""
    target = await _get_user_or_404(db, username)
    if target.id == me.id:
        raise HTTPException(status_code=400, detail="You can't follow yourself")
    exists = (
        await db.execute(select(Follow).where(Follow.follower_id == me.id, Follow.followee_id == target.id))
    ).scalar_one_or_none()
    if not exists:
        db.add(Follow(follower_id=me.id, followee_id=target.id))
        try:
            await db.commit()
        except IntegrityError:  # concurrent double-click: already following
            await db.rollback()
    return await _follow_state(db, target, True)


@router.delete("/users/{username}/follow")
async def unfollow_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Unfollow a user. Idempotent."""
    target = await _get_user_or_404(db, username)
    await db.execute(delete(Follow).where(Follow.follower_id == me.id, Follow.followee_id == target.id))
    await db.commit()
    return await _follow_state(db, target, False)
