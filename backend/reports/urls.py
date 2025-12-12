from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalyticsViewSet

router = DefaultRouter()
router.register(r'analytics', AnalyticsViewSet, basename='analytics')

app_name = "reports"

urlpatterns = [
    path('', include(router.urls)),
]
