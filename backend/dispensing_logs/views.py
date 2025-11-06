from rest_framework import generics, permissions
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import DispensingLog
from .serializers import DispensingLogSerializer
from users.permissions import IsPharmacistOrAdmin

class DispensingLogList(generics.ListAPIView):
    """
    List all dispensing logs.
    Only accessible by pharmacists and admins.
    Supports filtering, searching, and ordering.
    """
    serializer_class = DispensingLogSerializer
    permission_classes = [IsPharmacistOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['product', 'dispensed_by', 'order', 'created_at']
    search_fields = ['product__name', 'dispensed_by__username', 'notes']
    ordering_fields = ['created_at', 'product__name', 'quantity']
    ordering = ['-created_at']

    def get_queryset(self):
        return DispensingLog.objects.select_related(
            'product', 'dispensed_by', 'order'
        ).all()
