from datetime import datetime, timezone


def utcnow() -> datetime:
    """Naive UTC timestamp (matches the app's `DateTime` columns without timezone)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
