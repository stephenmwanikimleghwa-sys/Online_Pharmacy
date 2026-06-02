from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from users.permissions import IsPharmacistOrAdmin
from users.active_branch import get_active_branch, require_active_branch
from config.api_responses import api_invalid_transfer, api_success
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
            return api_invalid_transfer(
                "Only pending transfers can be approved.",
                details={"status": transfer.status},
            )

        transfer.status = 'approved'
        transfer.approved_by = request.user
        transfer.save()
        return api_success(
            f"Transfer from {transfer.source_branch.name} to {transfer.destination_branch.name} has been approved.",
            data=self.get_serializer(transfer).data,
            extra={"transfer": self.get_serializer(transfer).data},
        )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'approved':
            return api_invalid_transfer(
                "Only approved transfers can be completed.",
                details={"status": transfer.status},
            )

        transfer.status = 'completed'
        transfer.save()
        return api_success(
            "Stock has been moved and branch levels have been updated.",
            data=self.get_serializer(transfer).data,
            extra={"transfer": self.get_serializer(transfer).data},
        )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status not in ['pending', 'approved']:
            return api_invalid_transfer(
                "This transfer cannot be rejected in its current state.",
                details={"status": transfer.status},
            )

        transfer.status = 'rejected'
        transfer.save()
        admin_name = request.user.get_full_name() or request.user.username
        return api_success(
            f"The stock transfer request was rejected by {admin_name}.",
            data=self.get_serializer(transfer).data,
            extra={"transfer": self.get_serializer(transfer).data},
        )
