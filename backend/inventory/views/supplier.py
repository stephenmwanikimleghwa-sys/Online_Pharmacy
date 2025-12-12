from rest_framework import viewsets, permissions, filters
from inventory.models import Supplier
from inventory.serializers.supplier import SupplierSerializer

class SupplierViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing suppliers.
    """
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'contact_person', 'email', 'phone']
