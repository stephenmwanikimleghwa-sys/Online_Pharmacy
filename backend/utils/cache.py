from django.core.cache import cache
from functools import wraps
from rest_framework.response import Response
import hashlib
import json

def generate_cache_key(view_name, user, query_params):
    """
    Generate a unique cache key based on view, user context, and params.
    """
    # Use pharmacy ID for scoping if available, otherwise user ID
    context_id = getattr(user, 'pharmacy_id', user.id)
    
    # Sort params to ensure consistent keys
    params_str = json.dumps(query_params, sort_keys=True)
    
    key_string = f"{view_name}:{context_id}:{params_str}"
    return hashlib.md5(key_string.encode()).hexdigest()

def cache_response(timeout=60*15, key_prefix='view'):
    """
    Decorator to cache API responses.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(view_instance, request, *args, **kwargs):
            # Skip caching for non-GET requests
            if request.method != 'GET':
                return view_func(view_instance, request, *args, **kwargs)
            
            # Generate cache key
            cache_key = f"{key_prefix}:{generate_cache_key(view_func.__name__, request.user, request.query_params)}"
            
            # Check cache
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)
            
            # Execute view
            response = view_func(view_instance, request, *args, **kwargs)
            
            # Cache response data (only if successful)
            if response.status_code == 200:
                cache.set(cache_key, response.data, timeout)
                
            return response
        return _wrapped_view
    return decorator

def invalidate_cache(key_prefix):
    """
    Invalidate all keys with the given prefix.
    Note: This is a simplified version. Redis supports pattern deletion, 
    but LocMemCache does not efficiently support it without iteration.
    For production with Redis, use keys pattern matching.
    """
    try:
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(f"{key_prefix}:*")
        else:
            # Fallback for LocMemCache or others without delete_pattern
            # This is tricky without clearing everything. 
            # For now, we might just clear everything or accept short TTLs.
            # A safer approach for LocMem is to clear specific keys if known, 
            # but for "invalidate all analytics", clearing specific keys is hard.
            # We will assume Redis in production or short TTLs.
            pass 
    except Exception:
        pass
