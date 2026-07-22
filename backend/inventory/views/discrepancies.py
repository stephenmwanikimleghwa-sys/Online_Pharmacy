"""Stock-discrepancy read + resolve API for the reconciliation screen.

Discrepancies are created when an offline-synced sale oversells (see
inventory/services/sync.py). A manager reviews open ones against a physical
count and resolves them."""
from __future__ import annotations

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from config.api_responses import api_error, api_success, ApiErrorCode
from inventory.models.sync import StockDiscrepancy
from users.active_branch import filter_queryset_for_branch
from users.permissions import IsPharmacistOrAdmin


def _serialize(d: StockDiscrepancy) -> dict:
    return {
        "id": d.id,
        "branch": d.branch_id,
        "branch_name": d.branch.name if d.branch_id else None,
        "product": d.product_id,
        "product_name": d.product.name if d.product_id else None,
        "expected_quantity": float(d.expected_quantity),
        "requested_quantity": float(d.requested_quantity),
        "oversold_quantity": float(d.oversold_quantity),
        "resolved": d.resolved,
        "resolved_by": d.resolved_by_id,
        "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
        "resolution_note": d.resolution_note,
        "created_at": d.created_at.isoformat(),
    }


@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def discrepancy_list(request):
    """List stock discrepancies, branch-scoped. ?resolved=true|false filters."""
    qs = StockDiscrepancy.objects.select_related("branch", "product")
    qs = filter_queryset_for_branch(request, qs, branch_field="branch")

    resolved = request.query_params.get("resolved")
    if resolved is not None:
        qs = qs.filter(resolved=resolved.lower() in ("1", "true", "yes"))

    data = [_serialize(d) for d in qs[:500]]
    return api_success(
        f"{len(data)} discrepancy record(s).",
        data={"discrepancies": data},
        extra={"discrepancies": data},
    )


@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def resolve_discrepancy(request, pk):
    """Mark a discrepancy resolved after reconciling against physical count."""
    qs = filter_queryset_for_branch(
        request, StockDiscrepancy.objects.all(), branch_field="branch"
    )
    discrepancy = qs.filter(pk=pk).first()
    if discrepancy is None:
        return api_error(
            ApiErrorCode.NOT_FOUND,
            "Discrepancy not found.",
            http_status=status.HTTP_404_NOT_FOUND,
        )

    discrepancy.resolved = True
    discrepancy.resolved_by = request.user
    discrepancy.resolved_at = timezone.now()
    discrepancy.resolution_note = request.data.get("note", "")
    discrepancy.save(
        update_fields=["resolved", "resolved_by", "resolved_at", "resolution_note"]
    )
    return api_success("Discrepancy resolved.", data=_serialize(discrepancy))
