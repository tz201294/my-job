"""Spam limits: how often one account may post, comment, react and so on, and how many accounts one IP address
may create. Generous enough that nobody using the app normally hits them; they stop scripts and floods.

Use on a route: `dependencies=[Depends(limit("comment"))]`. Only actions that succeed are counted, so a typo
that gets rejected doesn't use up anyone's allowance. Counted per process in memory (see rate_limit.py);
with several API instances, move this to Redis.
"""
from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import ActionLimiter
from app.models import User

MINUTE, HOUR, DAY = 60, 60 * 60, 24 * 60 * 60

# name: (limits as (count, window seconds), what the person sees when they hit it)
RULES = {
    # Per IP address: new accounts.
    "signup": ([(5, HOUR), (20, DAY)], "Too many new accounts from this network"),
    "forgot": ([(10, HOUR), (30, DAY)], "Too many password reset requests from this network"),
    # Per account:
    "post": ([(10, HOUR), (30, DAY)], "You're publishing a lot"),  # posts and live work challenges
    "story": ([(20, HOUR), (50, DAY)], "You've shared a lot of stories"),
    "comment": ([(10, MINUTE), (120, HOUR)], "You're commenting very fast"),  # comments, answers, ideas, reviews
    "question": ([(10, HOUR), (30, DAY)], "You've asked a lot of questions"),  # each lands in someone's inbox
    "reaction": ([(60, MINUTE), (600, HOUR)], "You're doing that very fast"),  # likes, saves, upvotes, follows
    "edit": ([(30, MINUTE), (300, HOUR)], "You're making a lot of changes"),
    "report": ([(20, HOUR), (50, DAY)], "You've sent a lot of reports"),
    "export": ([(5, HOUR), (20, DAY)], "You've downloaded your data several times already"),
    "email": ([(3, HOUR), (10, DAY)], "We've already sent you several emails"),  # resending confirmation links
}

# Not answered with 429 (that would tell a stranger the account exists): over this, reset emails just stop.
SILENT_RULES = {
    "reset_email": [(3, HOUR), (6, DAY)],  # password-reset emails per account
}

limiters = {name: ActionLimiter(limits) for name, (limits, _) in RULES.items()}
limiters.update({name: ActionLimiter(limits) for name, limits in SILENT_RULES.items()})


def allow_silently(name: str, key: str) -> bool:
    """For SILENT_RULES: counts one action and says whether it is allowed (no error either way)."""
    if not settings.RATE_LIMITS_ENABLED:
        return True
    if limiters[name].retry_after(key):
        return False
    limiters[name].record(key)
    return True


def _wait_text(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds} second{'s' if seconds != 1 else ''}"
    minutes = -(-seconds // 60)
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    hours = -(-minutes // 60)
    return f"{hours} hour{'s' if hours != 1 else ''}"


def check(name: str, key: str) -> None:
    """Raises 429 (with Retry-After) if `key` is over the `name` limit."""
    if not settings.RATE_LIMITS_ENABLED:
        return
    wait = limiters[name].retry_after(key)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{RULES[name][1]}. Please try again in {_wait_text(wait)}.",
            headers={"Retry-After": str(wait)},
        )


def limit(name: str):
    """A route dependency that counts the request against the signed-in user's `name` limit."""
    assert name in RULES and name not in IP_RULES, name

    async def dependency(user: User = Depends(get_current_user)):
        key = str(user.id)
        check(name, key)
        yield
        # Reached only if the request succeeded (an error raised by the route ends the dependency at `yield`).
        limiters[name].record(key)

    return dependency


IP_RULES = {"signup", "forgot"}  # counted per IP address, for requests made without logging in


def limit_ip(name: str):
    """A route dependency that counts the request against the visitor's IP address."""
    assert name in IP_RULES, name

    async def dependency(request: Request):
        # Behind Render's proxy uvicorn runs with --proxy-headers, so this is the visitor's real address.
        key = request.client.host if request.client else "unknown"
        check(name, key)
        yield
        limiters[name].record(key)

    return dependency


def clear_all() -> None:
    for limiter in limiters.values():
        limiter.clear()
