"""
Health check endpoint for deployment monitoring
"""
from django.http import JsonResponse
from django.db import connection
import os
from django.conf import settings


def health_check(request):
    """
    Health check endpoint that verifies database/redis connectivity.
    SECURITY (H2): Only returns 'healthy' or 'unhealthy'.
    Internal details are logged but never exposed to the client.

    Supports ?fast=1 query param for lightweight keep-alive pings
    that skip DB/Redis checks (used by external cron monitors).
    """
    # Fast mode: skip DB/Redis checks for keep-alive pings
    if request.GET.get("fast") == "1":
        return JsonResponse({"status": "healthy"}, status=200)

    is_healthy = True
    
    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        is_healthy = False
        import logging
        logging.getLogger(__name__).error("health_check_db_error: %s", e)
    
    # Check Redis connection (if configured)
    try:
        redis_url = os.getenv('REDIS_URL')
        if redis_url:
            valid_schemes = ("redis://", "rediss://", "unix://")
            if redis_url.startswith(valid_schemes):
                import redis
                r = redis.from_url(redis_url)
                r.ping()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("health_check_redis_error: %s", e)

    # Return minimal status
    status_code = 200 if is_healthy else 503
    return JsonResponse({"status": "healthy" if is_healthy else "unhealthy"}, status=status_code)


def storage_health(request):
    """
    Simple storage health check.
    SECURITY (H2): Does not leak bucket names or endpoints.
    """
    use_s3 = getattr(settings, "USE_S3", False)
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
    access_key = getattr(settings, "AWS_ACCESS_KEY_ID", "")

    if not use_s3:
        return JsonResponse({"status": "healthy"}, status=200)

    if not bucket or not access_key:
        return JsonResponse({"status": "unhealthy"}, status=503)

    return JsonResponse({"status": "healthy"}, status=200)
