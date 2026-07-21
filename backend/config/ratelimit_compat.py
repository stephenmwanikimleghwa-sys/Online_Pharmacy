"""Resilient access to django-ratelimit's `ratelimit` decorator.

The rate-limit throttling on auth/payment endpoints is a security *enhancement*
layered on top of DRF's global throttling. A missing or broken `django_ratelimit`
install should therefore degrade gracefully (endpoints still work, just without
the extra per-IP throttle) rather than crash the entire application at import
time — which is exactly what took the production deploy down.

settings.py already guards `RatelimitMiddleware` behind a try/except; this mirrors
that tolerance for the decorator itself.
"""
import logging

logger = logging.getLogger(__name__)

try:
    from django_ratelimit.decorators import ratelimit  # noqa: F401

    RATELIMIT_AVAILABLE = True
except ImportError:  # pragma: no cover - only hit when the dep is absent
    RATELIMIT_AVAILABLE = False
    logger.warning(
        "django_ratelimit is not installed; per-endpoint rate limiting is "
        "DISABLED. Install django-ratelimit to restore brute-force protection."
    )

    def ratelimit(*_args, **_kwargs):
        """No-op stand-in matching django_ratelimit.decorators.ratelimit's
        (key=..., rate=..., block=...) factory signature. Returns the view
        unchanged so decorated views keep working without throttling."""

        def decorator(view_func):
            return view_func

        return decorator
