from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalyticsViewSet, ReportsHubViewSet

router = DefaultRouter()
router.register(r'analytics', AnalyticsViewSet, basename='analytics')
router.register(r'hub', ReportsHubViewSet, basename='reports-hub')

app_name = "reports"

urlpatterns = [
    path('', include(router.urls)),
]
