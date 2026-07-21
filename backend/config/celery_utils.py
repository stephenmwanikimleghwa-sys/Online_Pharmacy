"""Resilient task enqueuing.

Calling `task.delay(...)` from inside a request handler publishes a message to
the Celery broker (Redis). If the broker is unreachable — exactly the outage
that also takes down the cache and rate limiter — `.delay()` retries the broker
connection and then raises `kombu.exceptions.OperationalError`, turning a
best-effort background notification into a 500 on the user's request.

Background notifications (emails, push) are non-critical side effects: a broker
hiccup must not fail the primary action (uploading a prescription, creating a
restock request). `safe_delay` enqueues the task and, on any broker/connection
error, logs and returns None instead of propagating — mirroring the fail-open
philosophy already used for the cache (IGNORE_EXCEPTIONS) and rate limiter
(RATELIMIT_FAIL_OPEN).
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def safe_delay(task, *args, **kwargs) -> Any | None:
    """Best-effort `task.delay(*args, **kwargs)`.

    Returns the AsyncResult on success, or None if the broker could not be
    reached. Never raises for broker/transport problems — only genuinely
    unexpected errors propagate.
    """
    try:
        return task.delay(*args, **kwargs)
    except Exception as exc:  # noqa: BLE001 - broker down must not break the request
        # kombu.exceptions.OperationalError, redis.exceptions.ConnectionError,
        # OSError, etc. all mean "broker unavailable". Degrade gracefully.
        task_name = getattr(task, "name", getattr(task, "__name__", repr(task)))
        logger.warning(
            "safe_delay: could not enqueue task %s (broker unavailable?): %s",
            task_name,
            exc,
        )
        return None
