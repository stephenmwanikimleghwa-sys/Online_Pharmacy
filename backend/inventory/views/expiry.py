from datetime import date

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.active_branch import get_active_branch
from users.permissions import IsPharmacistOrAdmin
from config.api_responses import api_success, api_validation_error
from inventory.models.batch import Batch
from inventory.services.expiry import get_expiry_summary, get_expiry_batches
from products.models import BranchStock, StockLog
from users.utils import log_activity


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def expiry_summary_view(request):
    branch = get_active_branch(request) or getattr(request.user, "branch", None)
    branch_id = request.query_params.get("branch") or (branch.id if branch else None)
    is_admin = request.user.is_superuser or getattr(request.user, "role", None) == "admin"
    if not is_admin and branch_id and request.user.branch_id != int(branch_id):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    summary = get_expiry_summary(branch_id)
    batches = get_expiry_batches(branch_id)
    grouped = {"EXPIRED": [], "CRITICAL": [], "WARNING": [], "CAUTION": []}
    for row in batches:
        if row["status"] in grouped:
            grouped[row["status"]].append(row)
    return Response(
        {
            "summary": summary,
            "expired": grouped["EXPIRED"],
            "critical": grouped["CRITICAL"],
            "warning": grouped["WARNING"],
            "caution_count": len(grouped["CAUTION"]),
            "caution": grouped["CAUTION"][:20],
        }
    )


@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def mark_batch_removed(request, batch_id):
    batch = Batch.objects.select_related("product", "branch").filter(pk=batch_id).first()
    if not batch:
        return api_validation_error("Batch not found.")
    qty = batch.quantity_remaining
    branch = batch.branch
    with transaction.atomic():
        batch.quantity_remaining = 0
        batch.is_active = False
        batch.save(update_fields=["quantity_remaining", "is_active"])
        if branch:
            bs, _ = BranchStock.objects.get_or_create(
                product=batch.product, branch=branch, defaults={"quantity": 0}
            )
            prev = bs.quantity
            deduct = min(int(qty), prev)
            bs.quantity = prev - deduct
            bs.save(update_fields=["quantity"])
            StockLog.objects.create(
                product=batch.product,
                branch=branch,
                previous_quantity=prev,
                new_quantity=bs.quantity,
                change_amount=-deduct,
                change_type="expired",
                reason=f"Expired batch {batch.batch_number} removed from shelf",
                logged_by=request.user,
            )
        log_activity(
            user=request.user,
            event_type="STOCK_EXPIRED",
            branch=branch,
            details_dict={
                "batch_id": batch.id,
                "product_name": batch.product.name,
                "quantity": float(qty),
            },
        )
    return api_success("Expired stock marked as removed.")


@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def set_batch_clearance(request, batch_id):
    batch = Batch.objects.filter(pk=batch_id).first()
    if not batch:
        return api_validation_error("Batch not found.")
    price = request.data.get("clearance_price")
    if price is None:
        return api_validation_error("clearance_price is required.")
    batch.is_clearance = True
    batch.clearance_price = price
    batch.save(update_fields=["is_clearance", "clearance_price"])
    return api_success(
        "Batch marked for clearance pricing.",
        data={"batch_id": batch.id, "clearance_price": float(batch.clearance_price)},
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def batch_expiry_check(request, product_id):
    """POS expiry warning for earliest batch at active branch."""
    branch = get_active_branch(request) or getattr(request.user, "branch", None)
    if not branch:
        return Response({"level": "OK"})
    batch = (
        Batch.objects.filter(
            product_id=product_id,
            branch=branch,
            is_active=True,
            quantity_remaining__gt=0,
        )
        .order_by("expiry_date")
        .first()
    )
    if not batch:
        return Response({"level": "OK"})
    return Response(
        {
            "level": batch.status,
            "product_name": batch.product.name,
            "expiry_date": batch.expiry_date.isoformat(),
            "days_to_expiry": batch.days_to_expiry,
            "quantity_in_batch": float(batch.quantity_remaining),
            "is_clearance": batch.is_clearance,
            "clearance_price": (
                float(batch.clearance_price) if batch.clearance_price else None
            ),
        }
    )
