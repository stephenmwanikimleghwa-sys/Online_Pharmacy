"""
Health check endpoint for deployment monitoring
"""
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import redis
import os


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
            # Mask sensitive info but show scheme and prefix for debugging
            has_scheme = "://" in redis_url
            scheme = redis_url.split("://")[0] if has_scheme else "none"
            health_status["redis_debug"] = {
                "has_scheme": has_scheme,
                "scheme": scheme,
                "prefix": redis_url[:10] + "..." if len(redis_url) > 10 else redis_url
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
    from django.conf import settings
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
