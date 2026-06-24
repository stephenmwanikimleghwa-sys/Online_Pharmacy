from datetime import date, timedelta

from django.db.models import Count, F, DurationField, Q
from django.db.models.expressions import ExpressionWrapper

from inventory.models.batch import Batch


def get_expiry_summary(branch_id=None):
    today = date.today()
    qs = Batch.objects.filter(is_active=True, quantity_remaining__gt=0)
    if branch_id:
        qs = qs.filter(branch_id=branch_id)

    annotated = qs.annotate(
        duration=ExpressionWrapper(
            F("expiry_date") - today,
            output_field=DurationField(),
        )
    )
    summary = annotated.aggregate(
        expired=Count("id", filter=Q(duration__lt=timedelta(days=0))),
        critical=Count("id", filter=Q(duration__gte=timedelta(days=0), duration__lte=timedelta(days=7))),
        warning=Count("id", filter=Q(duration__gt=timedelta(days=7), duration__lte=timedelta(days=30))),
        caution=Count("id", filter=Q(duration__gt=timedelta(days=30), duration__lte=timedelta(days=90))),
    )
    return summary


def get_expiry_batches(branch_id=None, status_filter=None, window_days=None):
    today = date.today()
    qs = (
        Batch.objects.filter(is_active=True, quantity_remaining__gt=0)
        .select_related("product", "branch")
        .order_by("expiry_date")
    )
    if branch_id:
        qs = qs.filter(branch_id=branch_id)

    rows = []
    for batch in qs:
        days = batch.days_to_expiry
        status = batch.status
        if status_filter and status_filter.upper() != "ALL" and status != status_filter.upper():
            continue
        if window_days is not None:
            if days > window_days and status not in ("EXPIRED", "CRITICAL", "WARNING"):
                if status_filter is None and status == "CAUTION" and window_days >= 90:
                    pass
                elif window_days < 90 and days > window_days:
                    continue
        rows.append(
            {
                "id": batch.id,
                "product_id": batch.product_id,
                "product_name": batch.product.name,
                "batch_number": batch.batch_number,
                "branch_id": batch.branch_id,
                "branch_name": batch.branch.name if batch.branch else None,
                "quantity_remaining": float(batch.quantity_remaining),
                "expiry_date": batch.expiry_date.isoformat(),
                "days_left": days,
                "status": status,
                "is_clearance": batch.is_clearance,
                "clearance_price": (
                    float(batch.clearance_price) if batch.clearance_price else None
                ),
            }
        )
    rows.sort(key=lambda r: r["days_left"])
    return rows
