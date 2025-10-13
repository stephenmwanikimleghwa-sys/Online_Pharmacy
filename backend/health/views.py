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
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/1')
        r = redis.from_url(redis_url)
        r.ping()
        health_status["checks"]["redis"] = True
    except Exception as e:
        # Redis is optional, so we don't fail the health check
        health_status["checks"]["redis"] = False
        health_status["redis_warning"] = "Redis not available: " + str(e)
    
    # Return appropriate status code
    status_code = 200 if health_status["status"] == "healthy" else 503
    
    return JsonResponse(health_status, status=status_code)
