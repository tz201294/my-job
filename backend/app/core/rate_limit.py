"""In-memory sliding-window counter of failed login attempts.

Each API process keeps its own counts, which is enough to stop online password guessing against a
single instance. With several workers or replicas, move this to a shared store such as Redis.
"""
import math
import time
from collections import deque
from typing import Deque, Dict, Optional

# Drop keys whose attempts have all expired every this many calls, so memory stays bounded.
_SWEEP_EVERY = 1000


class FailureLimiter:
    def __init__(self, max_failures: int, window_seconds: int, clock=time.monotonic):
        self.max_failures = max_failures
        self.window = window_seconds
        self._clock = clock
        self._failures: Dict[str, Deque[float]] = {}
        self._calls = 0

    def _recent(self, key: str, now: float) -> Optional[Deque[float]]:
        q = self._failures.get(key)
        if q is None:
            return None
        while q and q[0] <= now - self.window:
            q.popleft()
        if not q:
            del self._failures[key]
            return None
        return q

    def _maybe_sweep(self, now: float) -> None:
        self._calls += 1
        if self._calls % _SWEEP_EVERY == 0:
            for key in list(self._failures):
                self._recent(key, now)

    def retry_after(self, key: str) -> Optional[int]:
        """Seconds until `key` may try again, or None if it is not blocked."""
        now = self._clock()
        self._maybe_sweep(now)
        q = self._recent(key, now)
        if q is None or len(q) < self.max_failures:
            return None
        # Blocked until the oldest failure that still counts falls out of the window.
        return max(1, math.ceil(q[-self.max_failures] + self.window - now))

    def record_failure(self, key: str) -> None:
        now = self._clock()
        self._recent(key, now)
        self._failures.setdefault(key, deque()).append(now)

    def reset(self, key: str) -> None:
        self._failures.pop(key, None)

    def clear(self) -> None:
        self._failures.clear()
