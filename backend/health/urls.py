"""
Health check URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    path("", views.health_check, name="health_check"),
    path("storage/", views.storage_health, name="storage_health"),
]
