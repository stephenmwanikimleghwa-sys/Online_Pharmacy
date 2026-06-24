"""Server-side response caching helpers for hot read endpoints."""

from django.core.cache import cache


def cached_view(cache_key: str, queryfn, timeout: int = 300):
    """Return cached data or compute via queryfn and store."""
    data = cache.get(cache_key)
    if data is None:
        data = queryfn()
        cache.set(cache_key, data, timeout)
    return data
