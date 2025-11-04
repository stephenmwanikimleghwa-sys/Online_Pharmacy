from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.restock import RestockRequestViewSet
from .views.dispensing import PrescriptionViewSet, DispensationViewSet
from .views.inventory import (
    inventory_summary,
    inventory_list,
    low_stock_items,
    out_of_stock_items,
    inventory_detail,
    restock_inventory,
    adjust_inventory,
    stock_logs,
)
from .views import dispensing

# Create a router for viewsets
router = DefaultRouter()
router.register(r'restock-requests', RestockRequestViewSet)
router.register(r'dispensations', DispensationViewSet)

app_name = "inventory"

urlpatterns = [
    # Include viewset URLs
    path('', include(router.urls)),
    
    # Inventory management
    path("summary/", inventory_summary, name="inventory_summary"),
     path("products/", inventory_list, name="inventory_list"),  # Changed to explicit path
    path("low-stock/", low_stock_items, name="low_stock_items"),
    path("out-of-stock/", out_of_stock_items, name="out_of_stock_items"),
    path("<int:pk>/", inventory_detail, name="inventory_detail"),
    path("<int:pk>/restock/", restock_inventory, name="restock_inventory"),
    path("<int:pk>/adjust/", adjust_inventory, name="adjust_inventory"),
    path("<int:pk>/logs/", stock_logs, name="stock_logs"),
    
    # Dispensing endpoints
    path('dispense/otc/', dispensing.dispense_otc, name='dispense_otc'),
    path('stats/dispensing/', dispensing.dispensing_stats, name='dispensing_stats'),
]
