"""
Security middleware: add secure response headers for all responses.
"""
from django.utils.deprecation import MiddlewareMixin


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security-related HTTP headers to every response.
    """

    def process_response(self, request, response):
        response["X-Content-Type-Options"] = "nosniff"
        # X-XSS-Protection is deprecated; the legacy auditor it enabled can
        # itself introduce vulnerabilities in older browsers. Modern guidance
        # (and OWASP) is to disable it and rely on a Content-Security-Policy.
        response["X-XSS-Protection"] = "0"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # Content-Security-Policy. API (JSON) responses get a locked-down policy
        # that blocks all resource loading and framing. HTML surfaces served from
        # the same app (Django admin, DRF browsable API) need their same-origin
        # CSS/JS, so they get a looser same-origin policy instead of being broken.
        path = request.path or ""
        if path.startswith("/admin") or path.startswith("/api-auth"):
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
            )
        else:
            csp = (
                "default-src 'none'; frame-ancestors 'none'; "
                "base-uri 'none'; form-action 'self'"
            )
        response.setdefault("Content-Security-Policy", csp)
        return response
