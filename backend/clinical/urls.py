from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConsultationViewSet, LabTestViewSet

router = DefaultRouter()
router.register(r'consultations', ConsultationViewSet, basename='consultation')
router.register(r'lab_tests', LabTestViewSet, basename='labtest')

app_name = 'clinical'

urlpatterns = [
    path('', include(router.urls)),
]
