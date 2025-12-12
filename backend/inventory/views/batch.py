from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from inventory.models import Batch
from inventory.serializers.batch import BatchSerializer

class BatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing batches.
    """
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'supplier', 'is_active']
    search_fields = ['batch_number', 'product__name', 'supplier__name']
    ordering_fields = ['expiry_date', 'received_date']
