from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
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

urlpatterns = [
    # Root redirect to Swagger
    path("", RedirectView.as_view(url="/swagger/", permanent=False), name="root"),
    # Admin site
    path("admin/", admin.site.urls),
    # API documentation
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
    # API endpoints
    path("api/auth/", include("users.urls")),
    path("api/products/", include("products.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/prescriptions/", include("prescriptions.urls")),
    path("api/reviews/", include("reviews.urls")),
    path("api/inventory/", include("inventory.urls")),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
