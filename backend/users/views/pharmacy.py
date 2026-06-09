from rest_framework import viewsets, permissions
from users.models import Pharmacy, RoleChoices
from users.serializers import PharmacySerializer

class IsAdminOrOwnPharmacist(permissions.BasePermission):
    """Admin can do anything. Pharmacist can only update their own pharmacy."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role == RoleChoices.ADMIN:
            return True
        # Pharmacists may list/retrieve + partial_update their own pharmacy
        if request.user.role == RoleChoices.PHARMACIST:
            return True
        return request.method in permissions.SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        if request.user.role == RoleChoices.ADMIN:
            return True
        # Pharmacist may only patch their own pharmacy
        if request.user.role == RoleChoices.PHARMACIST:
            if request.method in ('PATCH', 'PUT'):
                return request.user.pharmacy_id == obj.id
            return True
        return request.method in permissions.SAFE_METHODS

class PharmacyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pharmacies.
    Admins can perform all actions.
    Pharmacists can view and update their own pharmacy.
    """
    queryset = Pharmacy.objects.all()
    serializer_class = PharmacySerializer
    permission_classes = [IsAdminOrOwnPharmacist]

    def get_queryset(self):
        user = self.request.user
        if user.role == RoleChoices.ADMIN:
            return Pharmacy.objects.all()
        elif user.pharmacy:
            return Pharmacy.objects.filter(id=user.pharmacy.id)
        return Pharmacy.objects.none()
