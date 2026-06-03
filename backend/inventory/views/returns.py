from rest_framework import viewsets, status
from rest_framework.response import Response
from users.permissions import IsPharmacistOrAdmin
from ..models.returns import ProductReturn
from ..serializers.returns import ProductReturnSerializer
from django.db import transaction

class ProductReturnViewSet(viewsets.ModelViewSet):
    serializer_class = ProductReturnSerializer
    
    def get_permissions(self):
        return [IsPharmacistOrAdmin()]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ProductReturn.objects.none()
            
        user = self.request.user
        qs = (
            ProductReturn.objects
            .select_related('product', 'handled_by', 'branch')
            .all()
            .order_by('-timestamp')
        )
        if not (user.is_superuser or getattr(user, 'role', None) == 'admin') and user.branch:
            qs = qs.filter(branch=user.branch)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            serializer.save(
                handled_by=self.request.user,
                branch=self.request.user.branch
            )
