from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuotationViewSet

router = DefaultRouter()
router.register(r'quotations', QuotationViewSet, basename='quotation')

app_name = 'finance'

urlpatterns = [
    path('', include(router.urls)),
]
