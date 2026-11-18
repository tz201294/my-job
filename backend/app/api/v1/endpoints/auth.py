from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.rate_limits import allow_silently, limit, limit_ip
from app.api.deps import get_current_user, get_optional_user
from app.api.serializers import user_me_out, user_public_out
from app.core.config import settings
from app.core.rate_limit import FailureLimiter
from app.core.security import (
    EMAIL_VERIFY, PASSWORD_RESET, create_access_token, create_link_token, decode_link_token, hash_password,
    password_fingerprint, verify_password,
)
from app.core.time import utcnow
from app.services.account import delete_account
from app.core.legal import TERMS_VERSION
from app.services.data_export import export_user_data
from app.services.email import password_reset_email, send_email, verification_email
from app.services.moderation import ensure_can_interact, hidden_user_ids, is_admin
from app.services.notifications import notify
from app.core.taxonomy import INDUSTRY_OPTIONS, INTEREST_OPTIONS
from app.db.session import get_db
from app.models import Block, Follow, Notification, ProfessionProfile, User, UserInterest, UserSurvey
from app.schemas.user import (
    AccountDelete, EducationLevel, EmailVerify, ForgotPassword, Gender, NonWorkingStatus, PasswordChange,
    PasswordReset, ProfileUpdate, Token, UserCreate, UserLogin, UserMeResponse, UserResponse,
)

router = APIRouter()

SUSPENDED_MESSAGE = "This account has been suspended for breaking the community rules."

# Hash of a throwaway password, verified when the account doesn't exist so that
# response time does not reveal whether a username is registered.
_DUMMY_HASH = hash_password("not-a-real-password")

# Brute-force protection for /login: failures are counted per username and per client IP.
username_limiter = FailureLimiter(settings.LOGIN_MAX_FAILURES_PER_USERNAME, settings.LOGIN_FAILURE_WINDOW_SECONDS)
ip_limiter = FailureLimiter(settings.LOGIN_MAX_FAILURES_PER_IP, settings.LOGIN_FAILURE_WINDOW_SECONDS)


def _too_many_attempts(retry_after: int) -> HTTPException:
    minutes = max(1, -(-retry_after // 60))
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Too many failed login attempts. Try again in {minutes} minute{'s' if minutes != 1 else ''}.",
        headers={"Retry-After": str(retry_after)},
    )


# ---------- links sent by email ----------

def _email_link(page: str, token: str) -> str:
    # The token goes after "#": browsers never send that part to any server, so it stays out of logs.
    return f"{settings.FRONTEND_URL}/{page}#token={token}"


def _send_verification(background: BackgroundTasks, user: User) -> None:
    """Emails `user` a link confirming their (unconfirmed) address. Sent after the response."""
    if not user.email or user.email_verified_at:
        return
    token = create_link_token(
        EMAIL_VERIFY, user.id, minutes=settings.EMAIL_VERIFY_LINK_DAYS * 24 * 60, email=user.email.lower()
    )
    background.add_task(
        send_email, verification_email(user.email, user.full_name, _email_link("verify-email", token))
    )


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
            .where(User.is_active.is_(True), User.id.not_in(hidden_user_ids(viewer)))
            .order_by(ProfessionProfile.is_verified_pro.desc(), User.created_at)
            .limit(limit)
        )
    ).scalars().all()
    return [await user_public_out(db, u, viewer) for u in users]


@router.post(
    "/register", response_model=Token, status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limit_ip("signup"))],
)
async def register(user_in: UserCreate, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
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
        terms_accepted_at=utcnow(),
        terms_version=TERMS_VERSION,
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
    _send_verification(background, user)
    return Token(access_token=create_access_token(user.id), user=await user_me_out(db, user))


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    ident = credentials.username_or_email.strip().lower()
    # Behind a reverse proxy, run uvicorn with --proxy-headers so this is the real client address.
    ip = request.client.host if request.client else "unknown"

    blocked = [r for r in (username_limiter.retry_after(ident), ip_limiter.retry_after(ip)) if r]
    if blocked:
        raise _too_many_attempts(max(blocked))

    user = (
        await db.execute(select(User).where(or_(User.username == ident, func.lower(User.email) == ident)))
    ).scalars().first()

    if user is None:
        verify_password(credentials.password, _DUMMY_HASH)
        ok = False
    else:
        ok = verify_password(credentials.password, user.hashed_password)
    if not ok:
        username_limiter.record_failure(ident)
        ip_limiter.record_failure(ip)
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:  # only said to someone who knows the password
        raise HTTPException(status_code=403, detail=SUSPENDED_MESSAGE)

    username_limiter.reset(ident)
    return Token(access_token=create_access_token(user.id), user=await user_me_out(db, user))


@router.get("/me", response_model=UserMeResponse)
async def read_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await user_me_out(db, current_user)


@router.patch("/me", dependencies=[Depends(limit("edit"))], response_model=UserMeResponse)
async def update_me(
    changes_in: ProfileUpdate,
    background: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit your profile. Only the fields sent are changed."""
    changes = changes_in.changes()
    user = current_user
    user_id = user.id  # read now: attributes are expired (and can't lazy-load) after expire_all below

    for field in ("full_name", "bio", "avatar_url"):
        if field in changes:
            setattr(user, field, changes[field])

    if "email" in changes:
        email = changes_in.email.lower() if changes_in.email else None
        if email:
            taken = (
                await db.execute(select(User.id).where(func.lower(User.email) == email, User.id != user.id))
            ).first()
            if taken:
                raise HTTPException(status_code=409, detail="Email already registered")
        if email != (user.email or "").lower():
            user.email_verified_at = None  # a new address has to be confirmed again
        user.email = email

    if "interests" in changes:
        await db.execute(delete(UserInterest).where(UserInterest.user_id == user.id))
        for interest in changes_in.interests:
            db.add(UserInterest(user_id=user.id, interest=interest))

    if changes_in.works is False:
        await db.execute(delete(ProfessionProfile).where(ProfessionProfile.user_id == user.id))
    elif changes_in.profession is not None:
        p = changes_in.profession
        prof = (
            await db.execute(select(ProfessionProfile).where(ProfessionProfile.user_id == user.id))
        ).scalar_one_or_none()
        if prof is None:
            db.add(ProfessionProfile(
                user_id=user.id, industry=p.industry, title=p.title, specialization=p.specialization,
                years_of_experience=p.years_of_experience, company_or_freelance=p.company_or_freelance,
                is_verified_pro=False, key_tools=[],
            ))
        else:
            # The verified badge was granted for a specific profession; changing it removes the badge.
            if (prof.industry, prof.title) != (p.industry, p.title):
                prof.is_verified_pro = False
            prof.industry, prof.title = p.industry, p.title
            prof.specialization, prof.years_of_experience = p.specialization, p.years_of_experience
            prof.company_or_freelance = p.company_or_freelance

    if changes_in.data_consent is not None:
        survey = (await db.execute(select(UserSurvey).where(UserSurvey.user_id == user.id))).scalar_one_or_none()
        if survey is None:
            raise HTTPException(status_code=400, detail="This account has no sign-up survey to update")
        survey.data_consent = changes_in.data_consent

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")

    db.expire_all()
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one()
    if "email" in changes:
        _send_verification(background, user)  # only if the address is new (unconfirmed)
    return await user_me_out(db, user)


@router.post("/me/password", response_model=Token)
async def change_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change your password. Every other session is signed out; the response carries a new token for this one."""
    key = current_user.username
    blocked = username_limiter.retry_after(key)
    if blocked:
        raise _too_many_attempts(blocked)
    if not verify_password(body.current_password, current_user.hashed_password):
        username_limiter.record_failure(key)
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if body.new_password == body.current_password:
        raise HTTPException(status_code=400, detail="Choose a password different from the current one")

    current_user.hashed_password = hash_password(body.new_password)
    current_user.password_changed_at = utcnow()
    await db.commit()
    username_limiter.reset(key)
    return Token(access_token=create_access_token(current_user.id), user=await user_me_out(db, current_user))


FORGOT_PASSWORD_REPLY = (
    "If that account has a confirmed email address, we've sent it a link to choose a new password. "
    "Check your inbox (and the spam folder)."
)
INVALID_RESET_LINK = "This reset link is invalid, has expired or was already used. Ask for a new one."
INVALID_VERIFY_LINK = "This confirmation link is invalid or has expired. Send a new one from Settings."


@router.post("/password/forgot", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(limit_ip("forgot"))])
async def forgot_password(body: ForgotPassword, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Emails a password-reset link to the account's confirmed address. The reply is the same whether or not the
    account exists, so it can't be used to find out who has an account."""
    ident = body.username_or_email.strip().lower()
    user = (
        await db.execute(select(User).where(or_(User.username == ident, func.lower(User.email) == ident)))
    ).scalars().first()
    if (
        user and user.is_active and user.email and user.email_verified_at
        and allow_silently("reset_email", user.id)
    ):
        token = create_link_token(
            PASSWORD_RESET, user.id, minutes=settings.PASSWORD_RESET_LINK_MINUTES,
            pw=password_fingerprint(user.hashed_password),
        )
        background.add_task(send_email, password_reset_email(
            user.email, user.full_name, user.username, _email_link("reset-password", token)
        ))
    return {"detail": FORGOT_PASSWORD_REPLY}


@router.post("/password/reset", response_model=Token)
async def reset_password(body: PasswordReset, db: AsyncSession = Depends(get_db)):
    """Sets a new password with the link from the email, signs out every session and signs this one in.
    A link works once: it is tied to the password it was issued for."""
    claims = decode_link_token(body.token, PASSWORD_RESET)
    user = None
    if claims:
        user = (await db.execute(select(User).where(User.id == claims["sub"]))).scalar_one_or_none()
    if not user or not user.is_active or claims.get("pw") != password_fingerprint(user.hashed_password):
        raise HTTPException(status_code=400, detail=INVALID_RESET_LINK)

    user.hashed_password = hash_password(body.new_password)
    user.password_changed_at = utcnow()
    await db.commit()
    # A forgotten password usually comes after a few wrong guesses: lift any login lockout.
    username_limiter.reset(user.username)
    if user.email:
        username_limiter.reset(user.email.lower())
    return Token(access_token=create_access_token(user.id), user=await user_me_out(db, user))


@router.post("/email/verify")
async def verify_email(body: EmailVerify, db: AsyncSession = Depends(get_db)):
    """Confirms an email address with the link sent to it. Works without being logged in (the link may be opened
    on another device). Only for the address the link was sent to: changing it makes old links useless."""
    claims = decode_link_token(body.token, EMAIL_VERIFY)
    user = None
    if claims:
        user = (await db.execute(select(User).where(User.id == claims["sub"]))).scalar_one_or_none()
    if not user or not user.email or user.email.lower() != claims.get("email"):
        raise HTTPException(status_code=400, detail=INVALID_VERIFY_LINK)
    if not user.email_verified_at:
        user.email_verified_at = utcnow()
        await db.commit()
    return {"email": user.email, "email_verified": True}


@router.post("/email/resend", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(limit("email"))])
async def resend_verification(background: BackgroundTasks, current_user: User = Depends(get_current_user)):
    """Sends a new confirmation link to your email address."""
    if not current_user.email:
        raise HTTPException(status_code=400, detail="Add an email address in Settings first.")
    if current_user.email_verified_at:
        raise HTTPException(status_code=400, detail="Your email address is already confirmed.")
    _send_verification(background, current_user)
    return {"detail": f"We've sent a new confirmation link to {current_user.email}."}


@router.post("/me/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    body: AccountDelete,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete your account and everything you posted. Requires your password."""
    key = current_user.username
    blocked = username_limiter.retry_after(key)
    if blocked:
        raise _too_many_attempts(blocked)
    if not verify_password(body.password, current_user.hashed_password):
        username_limiter.record_failure(key)
        raise HTTPException(status_code=400, detail="Password is incorrect")
    user_id = current_user.id
    db.expunge(current_user)  # removed with bulk statements below; keep the ORM from touching it again
    await delete_account(db, user_id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
    # Suspended accounts are gone for everyone but moderators; someone who blocked you is gone for you. Someone
    # you blocked stays visible (with is_blocked), so you can unblock them.
    if (not user.is_active and not is_admin(viewer)) or (
        viewer is not None and await _has_blocked(db, user.id, viewer.id)
    ):
        raise HTTPException(status_code=404, detail="User not found")
    return await user_public_out(db, user, viewer)


async def _has_blocked(db: AsyncSession, blocker_id: str, blocked_id: str) -> bool:
    row = (
        await db.execute(select(Block.blocker_id).where(Block.blocker_id == blocker_id, Block.blocked_id == blocked_id))
    ).first()
    return row is not None


@router.post("/users/{username}/block", dependencies=[Depends(limit("edit"))])
async def block_user(username: str, db: AsyncSession = Depends(get_db), me: User = Depends(get_current_user)):
    """Block someone: neither of you sees the other's content any more, follows between you are removed, and
    neither can follow, comment on, react to, ask or notify the other. They aren't told."""
    target = await _get_user_or_404(db, username)
    if target.id == me.id:
        raise HTTPException(status_code=400, detail="You can't block yourself")
    if not await _has_blocked(db, me.id, target.id):
        db.add(Block(blocker_id=me.id, blocked_id=target.id))
        await db.execute(delete(Follow).where(
            or_(and_(Follow.follower_id == me.id, Follow.followee_id == target.id),
                and_(Follow.follower_id == target.id, Follow.followee_id == me.id))
        ))
        await db.execute(delete(Notification).where(
            or_(and_(Notification.user_id == me.id, Notification.actor_id == target.id),
                and_(Notification.user_id == target.id, Notification.actor_id == me.id))
        ))
        try:
            await db.commit()
        except IntegrityError:  # double click
            await db.rollback()
    return {"username": target.username, "is_blocked": True}


@router.delete("/users/{username}/block", dependencies=[Depends(limit("edit"))])
async def unblock_user(username: str, db: AsyncSession = Depends(get_db), me: User = Depends(get_current_user)):
    """Unblock someone. Follows removed by the block don't come back."""
    target = await _get_user_or_404(db, username)
    await db.execute(delete(Block).where(Block.blocker_id == me.id, Block.blocked_id == target.id))
    await db.commit()
    return {"username": target.username, "is_blocked": False}


@router.get("/me/export", dependencies=[Depends(limit("export"))])
async def export_my_data(db: AsyncSession = Depends(get_db), me: User = Depends(get_current_user)):
    """Everything Prologue stores about you, as a JSON file to download."""
    data = await export_user_data(db, me)
    return JSONResponse(data, headers={
        "Content-Disposition": f'attachment; filename="prologue-data-{me.username}.json"',
        "Cache-Control": "no-store",
    })


@router.get("/me/blocked")
async def list_blocked(db: AsyncSession = Depends(get_db), me: User = Depends(get_current_user)):
    """The accounts you blocked, most recent first."""
    rows = (
        await db.execute(
            select(User).join(Block, Block.blocked_id == User.id)
            .where(Block.blocker_id == me.id).order_by(Block.created_at.desc())
        )
    ).scalars().all()
    return [{"username": u.username, "full_name": u.full_name, "avatar_url": u.avatar_url} for u in rows]


async def _follow_state(db: AsyncSession, target: User, is_following: bool) -> dict:
    followers = (
        await db.execute(select(func.count()).select_from(Follow).where(Follow.followee_id == target.id))
    ).scalar_one()
    return {"username": target.username, "is_following": is_following, "followers_count": followers}


@router.post("/users/{username}/follow", dependencies=[Depends(limit("reaction"))])
async def follow_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """Follow a user. Idempotent: following someone you already follow is a no-op."""
    target = await _get_user_or_404(db, username)
    if target.id == me.id:
        raise HTTPException(status_code=400, detail="You can't follow yourself")
    await ensure_can_interact(db, me, target.id)
    exists = (
        await db.execute(select(Follow).where(Follow.follower_id == me.id, Follow.followee_id == target.id))
    ).scalar_one_or_none()
    if not exists:
        db.add(Follow(follower_id=me.id, followee_id=target.id))
        await notify(db, user_id=target.id, actor_id=me.id, type="follow", collapse=True)
        try:
            await db.commit()
        except IntegrityError:  # concurrent double-click: already following
            await db.rollback()
    return await _follow_state(db, target, True)


@router.delete("/users/{username}/follow", dependencies=[Depends(limit("reaction"))])
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
