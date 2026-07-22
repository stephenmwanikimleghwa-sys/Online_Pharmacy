"""Server-side application of operations queued by the offline client.

Entry point: ``apply_operation(op, branch, user)`` — dispatches one queued
operation to the matching write logic, exactly once, and returns a plain dict
result the sync view serializes back to the client.

Design invariants (see the offline-first plan):
  * Idempotent: a repeated ``client_uuid`` returns the stored result and applies
    nothing. The unique constraint on SyncOperation.client_uuid is the guard.
  * Never lose a sale: an oversold sale is still recorded; stock is clamped at
    zero and the shortfall becomes a StockDiscrepancy for manual reconciliation.
  * Row-locked: stock reads/writes use select_for_update so two overlapping sync
    batches on the same product/batch serialize instead of racing.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.utils import timezone

from inventory.models.batch import Batch
from inventory.models.dispensing import Dispensation, DispensationItem
from inventory.models.sync import (
    StockDiscrepancy,
    SyncOperation,
    SyncOpStatus,
    SyncOpType,
)
from products.models import BranchStock, Product, StockLog


class SyncApplyError(Exception):
    """Raised for an operation that cannot be applied and should not be retried
    (bad payload, unknown product). Distinct from transient/broker errors."""


def _decrement_stock_clamped(product, branch, qty, user, source_op):
    """Remove ``qty`` from a product's stock at ``branch`` using FEFO, clamping at
    zero and recording a StockDiscrepancy for any shortfall.

    Returns (batch_allocations, discrepancy_or_None). Assumes an open atomic block.
    All stock rows are locked with select_for_update by the caller's transaction.
    """
    qty = Decimal(str(qty))
    allocations: list[dict[str, Any]] = []
    discrepancy = None

    # Lock the aggregate branch-stock row first so concurrent syncs serialize.
    branch_stock, _ = BranchStock.objects.select_for_update().get_or_create(
        product=product, branch=branch, defaults={"quantity": Decimal("0"), "reorder_level": Decimal("0")}
    )
    expected = branch_stock.quantity

    # FEFO batch allocation, locked, only across non-expired batches with stock.
    remaining = qty
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

    # Oversell: the offline client sold more than the server can back. Record the
    # sale anyway, clamp aggregate stock at zero, and log the shortfall. `remaining`
    # captures the batch-level shortfall; the aggregate shortfall is qty - expected.
    applied_qty = qty
    if expected < qty:
        oversold = qty - expected
        discrepancy = StockDiscrepancy.objects.create(
            branch=branch,
            product=product,
            expected_quantity=expected,
            requested_quantity=qty,
            oversold_quantity=oversold,
            source_operation=source_op,
        )
        new_qty = Decimal("0")
    else:
        new_qty = expected - qty

    StockLog.objects.create(
        product=product,
        branch=branch,
        previous_quantity=int(expected),
        new_quantity=int(new_qty),
        change_amount=-int(applied_qty if expected >= qty else expected),
        change_type="sale",
        reason=f"Offline sync sale (op {source_op.client_uuid})"
        + (" [OVERSOLD]" if discrepancy else ""),
        logged_by=user,
    )
    branch_stock.quantity = new_qty
    branch_stock.save(update_fields=["quantity"])

    return allocations, discrepancy


def _apply_sale(payload, branch, user, source_op):
    """Create a Dispensation from a queued offline sale. Returns result dict."""
    items = payload.get("items") or []
    if not items:
        raise SyncApplyError("Sale has no items.")

    pricing_tier = payload.get("pricing_tier", "RETAIL")
    payment_mode = payload.get("payment_mode", "CASH")
    discount = Decimal(str(payload.get("discount", 0) or 0))

    total = Decimal("0")
    had_discrepancy = False

    dispensation = Dispensation.objects.create(
        sale_type="otc",
        patient_name=payload.get("patient_name", ""),
        payment_mode=payment_mode,
        pricing_tier=pricing_tier,
        discount=discount,
        dispensed_by=user,
        branch=branch,
        notes=payload.get("notes", ""),
        total_amount=0,
    )

    for item in items:
        try:
            product = Product.objects.get(pk=item["product_id"])
        except (KeyError, Product.DoesNotExist):
            raise SyncApplyError(f"Unknown product in sale: {item.get('product_id')!r}")
        qty = int(item["quantity"])
        if qty <= 0:
            continue
        price = (
            product.wholesale_price
            if pricing_tier == "WHOLESALE" and product.wholesale_price
            else product.price
        )
        line_total = Decimal(str(price)) * qty
        total += line_total

        allocations, discrepancy = _decrement_stock_clamped(
            product, branch, qty, user, source_op
        )
        had_discrepancy = had_discrepancy or discrepancy is not None

        # Record dispensation line(s). _skip_stock_update: this service already
        # did the (clamped) BranchStock decrement above, so the model must not
        # decrement again.
        if allocations:
            for alloc in allocations:
                batch = alloc["batch"]
                item_obj = DispensationItem(
                    dispensation=dispensation,
                    product=product,
                    quantity=int(alloc["quantity"]),
                    price_per_unit=price,
                    total_price=Decimal(str(price)) * int(alloc["quantity"]),
                    batch_number=batch.batch_number,
                    expiry_date=batch.expiry_date,
                )
                item_obj._skip_stock_update = True
                item_obj.save()
        else:
            # Fully oversold or no batches: still record the line for the audit trail.
            item_obj = DispensationItem(
                dispensation=dispensation,
                product=product,
                quantity=qty,
                price_per_unit=price,
                total_price=line_total,
                expiry_date=product.expiry_date,
            )
            item_obj._skip_stock_update = True
            item_obj.save()

    dispensation.total_amount = total - discount
    dispensation.save(update_fields=["total_amount"])

    return {
        "server_id": str(dispensation.id),
        "discrepancy": had_discrepancy,
        "total_amount": float(dispensation.total_amount),
    }


def apply_operation(op: dict, branch, user) -> dict:
    """Apply one queued operation idempotently. ``op`` = {client_uuid, op_type,
    payload, client_created_at?}. Returns a result dict for the client."""
    client_uuid = op.get("client_uuid")
    if not client_uuid:
        raise SyncApplyError("Missing client_uuid.")
    op_type = op.get("op_type")
    payload = op.get("payload") or {}

    # Idempotency guard: if we've already processed this client_uuid, return the
    # stored outcome without applying anything again.
    existing = SyncOperation.objects.filter(client_uuid=client_uuid).first()
    if existing is not None:
        return {
            "client_uuid": str(client_uuid),
            "status": SyncOpStatus.DUPLICATE,
            "server_id": existing.result_ref,
            "discrepancy": existing.had_discrepancy,
        }

    if op_type not in SyncOpType.values:
        raise SyncApplyError(f"Unsupported op_type: {op_type!r}")

    client_created_at = op.get("client_created_at")

    with transaction.atomic():
        if op_type == SyncOpType.SALE:
            result = _apply_sale(payload, branch, user, _placeholder_op(client_uuid, op_type, branch, user, payload, client_created_at))
        else:
            # intake / adjustment services land here in a later change; guard for now.
            raise SyncApplyError(f"op_type {op_type} not yet implemented server-side.")

        # Persist the ledger row inside the same transaction so dedup and effect
        # commit atomically — no window where stock moved but the guard is absent.
        SyncOperation.objects.filter(client_uuid=client_uuid).update(
            status=SyncOpStatus.APPLIED,
            result_ref=result.get("server_id", ""),
            had_discrepancy=result.get("discrepancy", False),
        )

    return {
        "client_uuid": str(client_uuid),
        "status": SyncOpStatus.APPLIED,
        "server_id": result.get("server_id"),
        "discrepancy": result.get("discrepancy", False),
    }


def _placeholder_op(client_uuid, op_type, branch, user, payload, client_created_at) -> SyncOperation:
    """Create the SyncOperation ledger row up front (inside the atomic block) so
    _decrement_stock_clamped can FK discrepancies to it. Finalized by the update
    in apply_operation once the effect succeeds."""
    parsed_dt = None
    if client_created_at:
        parsed_dt = timezone.now()  # client timestamps are advisory; stamp receipt time
    return SyncOperation.objects.create(
        client_uuid=client_uuid,
        op_type=op_type,
        status=SyncOpStatus.APPLIED,
        branch=branch,
        user=user,
        payload=payload,
        client_created_at=parsed_dt,
    )
