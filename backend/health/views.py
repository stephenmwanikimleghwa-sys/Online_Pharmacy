"""
Health check endpoint for deployment monitoring
"""
from django.http import JsonResponse
from django.db import connection
import os
import redis
from django.conf import settings


def health_check(request):
    """
    Health check endpoint that verifies:
    - Database connectivity
    - Redis connectivity (if configured)
    - Application status
    """
    health_status = {
        "status": "healthy",
        "checks": {
            "database": False,
            "redis": False,
            "application": True
        }
    }
    
    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status["checks"]["database"] = True
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = False
        health_status["database_error"] = str(e)
    
    # Check Redis connection (if configured)
    try:
        redis_url = os.getenv('REDIS_URL')
        if redis_url:
            # Validate that the URL has a proper Redis scheme
            valid_schemes = ("redis://", "rediss://", "unix://")
            if not redis_url.startswith(valid_schemes):
                health_status["checks"]["redis"] = False
                health_status["redis_warning"] = (
                    "REDIS_URL is not a valid Redis URL. "
                    "It must start with redis://, rediss://, or unix://. "
                    f"Got prefix: {redis_url[:15]}..."
                )
            else:
                # Mask sensitive info but show scheme for debugging
                scheme = redis_url.split("://")[0]
                health_status["redis_debug"] = {
                    "has_scheme": True,
                    "scheme": scheme,
                    "prefix": redis_url[:10] + "..."
                }
                
                r = redis.from_url(redis_url)
                r.ping()
                health_status["checks"]["redis"] = True
        else:
            health_status["checks"]["redis"] = False
            health_status["redis_warning"] = "REDIS_URL not configured"
    except Exception as e:
        # Redis is optional, so we don't fail the health check
        health_status["checks"]["redis"] = False
        health_status["redis_error_type"] = type(e).__name__
        health_status["redis_warning"] = "Redis error: " + str(e)
    
    # Diagnostic logging for Render (check for SSL/Proxy issues)
    import logging
    logger = logging.getLogger(__name__)
    logger.info("DEBUG: Health check request headers: %s", dict(request.headers))
    logger.info("DEBUG: Request is_secure: %s", request.is_secure())

    # Deeper diagnostics for the database issue
    db_cfg = settings.DATABASES.get("default", {})
    health_status["database_params"] = {
        "host": db_cfg.get("HOST"),
        "port": db_cfg.get("PORT"),
        "name": db_cfg.get("NAME"),
        "engine": db_cfg.get("ENGINE"),
        "options": {k: v for k, v in db_cfg.get("OPTIONS", {}).items() if k != "password"},
    }

    # Return appropriate status code
    status_code = 200 if health_status["status"] == "healthy" else 503
    
    return JsonResponse(health_status, status=status_code)


def storage_health(request):
    """
    Simple storage health check.

    - When using local storage: always returns OK.
    - When using S3-compatible storage (e.g. Supabase Storage via S3 API):
      checks that the required settings are present.
    """
    use_s3 = getattr(settings, "USE_S3", False)
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
    access_key = getattr(settings, "AWS_ACCESS_KEY_ID", "")
    endpoint = getattr(settings, "AWS_S3_ENDPOINT_URL", "")

    status = {
        "use_s3": bool(use_s3),
        "ok": False,
        "details": {},
    }

    if not use_s3:
        status["ok"] = True
        status["details"] = {"message": "Using local file storage (media/)."}
        return JsonResponse(status, status=200)

    missing = []
    if not bucket:
        missing.append("AWS_STORAGE_BUCKET_NAME")
    if not access_key:
        missing.append("AWS_ACCESS_KEY_ID")

    if missing:
        status["ok"] = False
        status["details"] = {
            "error": "Missing required storage settings.",
            "missing": missing,
        }
        return JsonResponse(status, status=503)

    status["ok"] = True
    status["details"] = {
        "bucket": bucket,
        "endpoint": endpoint or "aws-default",
    }
    return JsonResponse(status, status=200)
