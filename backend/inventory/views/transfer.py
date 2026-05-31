from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from users.permissions import IsPharmacistOrAdmin
from users.active_branch import get_active_branch, require_active_branch
from ..models import InterBranchTransfer
from ..serializers.transfer import InterBranchTransferSerializer


class InterBranchTransferViewSet(viewsets.ModelViewSet):
    queryset = InterBranchTransfer.objects.select_related(
        "product", "source_branch", "destination_branch", "requested_by"
    ).all()
    serializer_class = InterBranchTransferSerializer
    permission_classes = [IsPharmacistOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        is_admin = user.is_superuser or getattr(user, "role", None) == "admin"
        branch_param = self.request.query_params.get("source_branch")
        active = get_active_branch(self.request)

        if branch_param:
            qs = qs.filter(
                Q(source_branch_id=branch_param) | Q(destination_branch_id=branch_param)
            )
        elif active:
            qs = qs.filter(
                Q(source_branch=active) | Q(destination_branch=active)
            )
        elif not is_admin and user.branch_id:
            qs = qs.filter(
                Q(source_branch_id=user.branch_id) | Q(destination_branch_id=user.branch_id)
            )
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        denied = require_active_branch(request)
        if denied:
            return denied
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        active = get_active_branch(self.request)
        serializer.save(requested_by=self.request.user, source_branch=active)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'pending':
            return Response({'error': 'Can only approve pending transfers'}, status=status.HTTP_400_BAD_REQUEST)
            
        transfer.status = 'approved'
        transfer.approved_by = request.user
        transfer.save()
        return Response(self.get_serializer(transfer).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'approved':
            return Response({'error': 'Can only complete approved transfers'}, status=status.HTTP_400_BAD_REQUEST)
            
        transfer.status = 'completed'
        transfer.save()
        return Response(self.get_serializer(transfer).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status not in ['pending', 'approved']:
            return Response({'error': 'Cannot reject this transfer'}, status=status.HTTP_400_BAD_REQUEST)
            
        transfer.status = 'rejected'
        transfer.save()
        return Response(self.get_serializer(transfer).data)
