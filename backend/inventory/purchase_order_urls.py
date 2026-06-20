from django.urls import path, include
from rest_framework.routers import DefaultRouter
from inventory.views.purchase_order import PurchaseOrderViewSet

router = DefaultRouter()
router.register(r"", PurchaseOrderViewSet, basename="purchaseorder-root")

urlpatterns = [
    path("", include(router.urls)),
]
