from rest_framework import viewsets, status
from rest_framework.response import Response
from users.permissions import IsPharmacistOrAdmin, IsAdminUser
from ..models.services import ClinicalService, SoldService
from ..serializers.services import ClinicalServiceSerializer, SoldServiceSerializer
from django.db import transaction

class ClinicalServiceViewSet(viewsets.ModelViewSet):
    queryset = ClinicalService.objects.all()
    serializer_class = ClinicalServiceSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsPharmacistOrAdmin()]

class SoldServiceViewSet(viewsets.ModelViewSet):
    serializer_class = SoldServiceSerializer
    
    def get_permissions(self):
        return [IsPharmacistOrAdmin()]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return SoldService.objects.none()
            
        user = self.request.user
        qs = SoldService.objects.all().order_by('-timestamp')
        if not (user.is_superuser or getattr(user, 'role', None) == 'admin') and user.branch:
            qs = qs.filter(branch=user.branch)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            serializer.save(
                sold_by=self.request.user,
                branch=self.request.user.branch
            )
