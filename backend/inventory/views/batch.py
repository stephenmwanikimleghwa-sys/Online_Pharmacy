from rest_framework import viewsets, permissions, filters
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from inventory.models import Batch
from inventory.serializers.batch import BatchSerializer
from users.active_branch import get_active_branch
from users.permissions import IsPharmacistOrAdmin


class BatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing batches.

    SECURITY (C4): Batches are branch-scoped. Pharmacists can only access
    batches belonging to their active branch. Admins can access all branches.
    """
    serializer_class = BatchSerializer
    permission_classes = [IsPharmacistOrAdmin]  # C4: restrict to pharmacist/admin
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'supplier', 'is_active']
    search_fields = ['batch_number', 'product__name', 'supplier__name']
    ordering_fields = ['expiry_date', 'received_date']

    def get_queryset(self):
        """C4: Filter batches to the user's active branch."""
        user = self.request.user
        role = getattr(user, 'role', None)

        # Start with all batches
        queryset = Batch.objects.select_related('product', 'supplier', 'branch').all()

        # Admins: optionally scope by active branch
        if role == 'admin' or user.is_superuser:
            active_branch = get_active_branch(self.request)
            if active_branch:
                return queryset.filter(branch=active_branch)
            return queryset

        # Pharmacists/cashiers: hard-scope to their active branch only
        active_branch = get_active_branch(self.request)
        if not active_branch:
            return Batch.objects.none()
        return queryset.filter(branch=active_branch)

    def _check_branch_ownership(self, instance):
        """Raise PermissionDenied if the batch belongs to a different branch (C4/H4 IDOR)."""
        user = self.request.user
        role = getattr(user, 'role', None)
        if role == 'admin' or user.is_superuser:
            return  # Admins can access any batch
        active_branch = get_active_branch(self.request)
        if not active_branch or instance.branch_id != active_branch.id:
            raise PermissionDenied(
                "You do not have access to batch data from another branch."
            )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._check_branch_ownership(instance)
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._check_branch_ownership(instance)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._check_branch_ownership(instance)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self._check_branch_ownership(instance)
        return super().destroy(request, *args, **kwargs)
