from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.inventory import (
    inventory_summary, inventory_list, low_stock_items,
    out_of_stock_items, inventory_detail, restock_inventory,
    adjust_inventory, stock_logs
)
from .views.restock import RestockRequestViewSet
from .views.stock_intake import StockIntakeViewSet
from .views.dispensing import dispense_otc, dispensing_stats, PrescriptionViewSet, DispensationViewSet
from .views.exports import export_inventory, export_stock_logs, export_restock_requests
from .views.transfer import InterBranchTransferViewSet
from .views.services import ClinicalServiceViewSet, SoldServiceViewSet
from .views.returns import ProductReturnViewSet
from .views.sales_returns import SaleReturnViewSet
from .views.document import DocumentViewSet
from .views.supplier import SupplierViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'restock-requests', RestockRequestViewSet, basename='restockrequest')
router.register(r'stock-intake', StockIntakeViewSet, basename='stockintake')
router.register(r'transfers', InterBranchTransferViewSet, basename='interbranchtransfer')
router.register(r'clinical-services', ClinicalServiceViewSet, basename='clinical-service')
router.register(r'sold-services', SoldServiceViewSet, basename='sold-service')
router.register(r'product-returns', ProductReturnViewSet, basename='product-return')
router.register(r'sales-returns', SaleReturnViewSet, basename='sales-return')
router.register(r'prescriptions', PrescriptionViewSet, basename='prescription')
router.register(r'dispensations', DispensationViewSet, basename='dispensation')
router.register(r'documents', DocumentViewSet, basename='document')

app_name = 'inventory'

urlpatterns = [
    # ViewSets
    path('', include(router.urls)),

    # Dashboard & Summaries
    path('summary/', inventory_summary, name='summary'),
    path('list/', inventory_list, name='list'),
    path('low-stock/', low_stock_items, name='low-stock'),
    path('out-of-stock/', out_of_stock_items, name='out-of-stock'),
    
    # Item Operations
    path('<int:pk>/', inventory_detail, name='detail'),
    path('<int:pk>/restock/', restock_inventory, name='restock'),
    path('<int:pk>/adjust/', adjust_inventory, name='adjust'),
    
    # Logs & History
    path('logs/', stock_logs, name='logs'),
    
    # Dispensing
    path('dispense/otc/', dispense_otc, name='dispense-otc'),
    path('dispensing/stats/', dispensing_stats, name='dispensing-stats'),
    
    # Exports
    path('export/inventory/', export_inventory, name='export-inventory'),
    path('export/stock-logs/', export_stock_logs, name='export-stock-logs'),
    path('export/restock-requests/', export_restock_requests, name='export-restock-requests'),
]
