from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
import os
from django.views.generic import RedirectView
from django.shortcuts import redirect
from django.http import HttpRequest
from urllib.parse import urlparse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# Swagger schema view
schema_view = get_schema_view(
    openapi.Info(
        title="Transcounty Pharmacy API",
        default_version="v1",
        description="API for Transcounty Pharmacy management in Kenya",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="admin@transcountypharmacy.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "")


def root_redirect(request: HttpRequest):
    """Redirect root to frontend URL or local swagger UI.

    Avoid redirecting to the same host (which causes an infinite loop).
    If `FRONTEND_URL` is set and its network location differs from the
    current request host, redirect there. Otherwise redirect to `/swagger/`.
    """
    if FRONTEND_URL:
        try:
            parsed = urlparse(FRONTEND_URL)
            frontend_host = parsed.netloc
            # Compare hosts (may include port)
            if frontend_host and frontend_host != request.get_host():
                return redirect(FRONTEND_URL)
        except Exception:
            # If parsing fails, fall back to swagger redirect below
            pass
    return redirect("/swagger/")

urlpatterns = [
    # Root: redirect to frontend (configurable) or docs by default
    path("", root_redirect, name="root"),
    # Admin site
    path("admin/", admin.site.urls),
    # API documentation
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
    # Health check
    path("api/health/", include("health.urls")),
    # API endpoints
    path("api/auth/", include("users.urls")),
    path("api/products/", include("products.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/prescriptions/", include("prescriptions.urls")),
    path("api/reviews/", include("reviews.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/dispensing-logs/", include("dispensing_logs.urls")),
    path("api/reports/", include("reports.urls")),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
