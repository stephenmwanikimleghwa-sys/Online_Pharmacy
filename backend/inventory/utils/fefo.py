from datetime import date
from decimal import Decimal

from django.db import transaction

from inventory.models.batch import Batch
from products.models import BranchStock, StockLog


class InsufficientStockError(Exception):
    pass


def dispense_with_fefo(product, branch, qty, logged_by=None):
    """
    Deduct stock using FEFO (first expiry, first out) across batches.
    Also decrements aggregate BranchStock.
  Returns list of {batch, quantity} allocations.
    """
    qty = Decimal(str(qty))
    if qty <= 0:
        return []

    batches = (
        Batch.objects.select_for_update()
        .filter(
            product=product,
            branch=branch,
            is_active=True,
            quantity_remaining__gt=0,
            expiry_date__gte=date.today(),
        )
        .order_by("expiry_date", "id")
    )

    remaining = qty
    allocations = []

    for batch in batches:
        if remaining <= 0:
            break
        available = batch.quantity_remaining
        if available <= 0:
            continue
        take = min(available, remaining)
        batch.quantity_remaining = available - take
        batch.save(update_fields=["quantity_remaining"])
        allocations.append({"batch": batch, "quantity": take})
        remaining -= take

    if remaining > 0:
        dispensed = qty - remaining
        raise InsufficientStockError(
            f"Only {dispensed} units available across all batches "
            f"(requested {qty})."
        )

    branch_stock, _ = BranchStock.objects.select_for_update().get_or_create(
        product=product,
        branch=branch,
        defaults={"quantity": 0, "reorder_level": 0},
    )
    prev = branch_stock.quantity
    if branch_stock.quantity < qty:
        raise InsufficientStockError(
            f"Branch stock mismatch: only {branch_stock.quantity} units at branch."
        )
    branch_stock.quantity = prev - int(qty)
    branch_stock.save(update_fields=["quantity"])

    StockLog.objects.create(
        product=product,
        branch=branch,
        previous_quantity=prev,
        new_quantity=branch_stock.quantity,
        change_amount=-int(qty),
        change_type="sale",
        reason=f"FEFO sale ({len(allocations)} batch(es))",
        logged_by=logged_by,
    )

    return allocations


def earliest_batch_for_product(product, branch):
    """Return the earliest non-expired batch with stock, for POS warnings."""
    return (
        Batch.objects.filter(
            product=product,
            branch=branch,
            is_active=True,
            quantity_remaining__gt=0,
            expiry_date__gte=date.today(),
        )
        .order_by("expiry_date", "id")
        .first()
    )


def check_expiry_warning_level(batch):
    """Return CRITICAL, WARNING, CAUTION, OK, or EXPIRED."""
    if not batch:
        return "OK"
    return batch.status
