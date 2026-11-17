"""Error reporting (Sentry). Off unless SENTRY_DSN is set.

With it on, unexpected server errors (500s) and crashes are sent to Sentry with the stack trace, so they show up
there (and by email) instead of only in the host's logs. Expected errors such as 404 or a wrong password are not
reported.

Privacy: no personal data is sent. Request bodies (passwords, posts), cookies, auth headers, IP addresses and the
values of local variables are all left out; Sentry receives the error, the stack trace and the request's address.
"""
import os

from app.core.config import settings


def sentry_options() -> dict:
    return dict(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        # Render sets RENDER_GIT_COMMIT, so each error says which version of the code it came from.
        release=os.environ.get("RENDER_GIT_COMMIT") or settings.VERSION,
        # Personal data (IP addresses, cookies, auth headers) is not sent: that's the SDK's default.
        max_request_body_size="never",
        include_local_variables=False,
        # Performance tracing is off by default to stay inside the free plan.
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
    )


def init_error_reporting() -> bool:
    """Starts Sentry if SENTRY_DSN is set. Returns whether it did."""
    if not settings.SENTRY_DSN:
        return False
    import sentry_sdk

    sentry_sdk.init(**sentry_options())
    return True
