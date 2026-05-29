from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuotationViewSet
from .views.financial_overview import FinancialOverviewViewSet

router = DefaultRouter()
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'overview', FinancialOverviewViewSet, basename='financial-overview')

app_name = 'finance'

urlpatterns = [
    path('', include(router.urls)),
]
