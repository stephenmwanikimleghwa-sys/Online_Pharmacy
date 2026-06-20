from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from users.permissions import IsPharmacistOrAdmin
from users.active_branch import get_active_branch, require_active_branch
from config.api_responses import api_invalid_transfer, api_success, api_validation_error
from ..models import InterBranchTransfer
from ..serializers.transfer import InterBranchTransferSerializer
from users.utils import log_activity


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
        status_param = self.request.query_params.get("status")
        branch_param = self.request.query_params.get("source_branch")
        active = get_active_branch(self.request)

        if status_param:
            qs = qs.filter(status=status_param)
        if branch_param:
            qs = qs.filter(
                Q(source_branch_id=branch_param) | Q(destination_branch_id=branch_param)
            )
        elif active:
            qs = qs.filter(Q(source_branch=active) | Q(destination_branch=active))
        elif not is_admin and user.branch_id:
            qs = qs.filter(
                Q(source_branch_id=user.branch_id) | Q(destination_branch_id=user.branch_id)
            )
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        denied = require_active_branch(request)
        if denied:
            return denied
        active = get_active_branch(request)
        data = request.data.copy()
        if not data.get("destination_branch"):
            data["destination_branch"] = active.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        transfer = serializer.save(requested_by=request.user)
        log_activity(
            user=request.user,
            event_type="TRANSFER_REQUESTED",
            branch=active,
            details_dict={
                "transfer_id": transfer.id,
                "product_name": transfer.product.name,
                "quantity": transfer.quantity,
                "from": transfer.source_branch.name,
                "to": transfer.destination_branch.name,
            },
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != "pending":
            return api_invalid_transfer(
                "Only pending transfers can be approved.",
                details={"status": transfer.status},
            )
        transfer.status = "completed"
        transfer.approved_by = request.user
        try:
            transfer.save()
        except ValueError as e:
            return api_validation_error(str(e))

        log_activity(
            user=request.user,
            event_type="TRANSFER_APPROVED",
            branch=transfer.destination_branch,
            details_dict={"transfer_id": transfer.id},
        )
        return api_success(
            "Transfer approved. Stock levels updated.",
            data=self.get_serializer(transfer).data,
        )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        return self.approve(request, pk=pk)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status not in ["pending", "approved"]:
            return api_invalid_transfer(
                "This transfer cannot be rejected in its current state.",
                details={"status": transfer.status},
            )
        reason = request.data.get("reason", "").strip()
        if not reason:
            return api_validation_error("Rejection reason is required.")
        transfer.status = "rejected"
        transfer.rejection_reason = reason
        transfer.approved_by = request.user
        transfer.save()
        log_activity(
            user=request.user,
            event_type="TRANSFER_REJECTED",
            branch=transfer.destination_branch,
            details_dict={"transfer_id": transfer.id, "reason": reason},
        )
        admin_name = request.user.get_full_name() or request.user.username
        return api_success(
            f"Transfer of {transfer.product.name} was rejected: {reason}",
            data=self.get_serializer(transfer).data,
            extra={"rejected_by": admin_name, "reason": reason},
        )
