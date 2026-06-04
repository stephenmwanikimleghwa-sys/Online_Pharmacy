from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "products"

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'pricing-tiers', views.PricingTierViewSet, basename='pricing-tier')
router.register(r'', views.ProductViewSet, basename='product')

urlpatterns = [
    # Keep existing function-based views BEFORE router to avoid being intercepted
    path("search/", views.search_products, name="search"),
    path("my-products/", views.my_products, name="my_products"),
    path("pricing-summary/", views.pricing_summary, name="pricing_summary"),
    
    # ViewSet URLs (includes list, create, retrieve, update, delete)
    path('', include(router.urls)),
]
