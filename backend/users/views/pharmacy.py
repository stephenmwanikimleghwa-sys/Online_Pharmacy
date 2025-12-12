from rest_framework import viewsets, permissions
from users.models import Pharmacy, RoleChoices
from users.serializers import PharmacySerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role == RoleChoices.ADMIN

class PharmacyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pharmacies.
    Admins can perform all actions.
    Pharmacists can view their own pharmacy.
    """
    queryset = Pharmacy.objects.all()
    serializer_class = PharmacySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == RoleChoices.ADMIN:
            return Pharmacy.objects.all()
        elif user.role == RoleChoices.PHARMACIST and user.pharmacy:
            return Pharmacy.objects.filter(id=user.pharmacy.id)
        return Pharmacy.objects.none()

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminOrReadOnly()]
        return [permissions.IsAuthenticated()]
