"""Offline-sync bookkeeping models.

These support the offline-first client: a durable idempotency ledger so queued
operations replay exactly once, and a discrepancy record for the oversell case
that offline selling makes unavoidable (two terminals sell the same stock while
disconnected). See config/urls.py -> /api/sync/ and inventory/services/sync.py.
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class SyncOpType(models.TextChoices):
    SALE = "sale", "Sale / dispense"
    INTAKE = "intake", "Stock intake"
    ADJUSTMENT = "adjustment", "Stock adjustment"


class SyncOpStatus(models.TextChoices):
    APPLIED = "applied", "Applied"
    DUPLICATE = "duplicate", "Duplicate (already applied)"
    CONFLICT = "conflict", "Conflict"
    ERROR = "error", "Error"


class SyncOperation(models.Model):
    """Idempotency ledger for operations replayed from an offline client.

    The client generates ``client_uuid`` when it queues an action locally and
    resends it (possibly many times) until acknowledged. The unique constraint
    on ``client_uuid`` is the replay guard: the second attempt short-circuits to
    the stored result instead of applying the operation again.
    """

    client_uuid = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        help_text="Client-generated id; the idempotency key for replay.",
    )
    op_type = models.CharField(max_length=20, choices=SyncOpType.choices)
    status = models.CharField(
        max_length=20, choices=SyncOpStatus.choices, default=SyncOpStatus.APPLIED
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sync_operations",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sync_operations",
    )
    payload = models.JSONField(default=dict, help_text="The operation as sent by the client.")
    result_ref = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reference to the record created server-side (e.g. dispensation id).",
    )
    error_detail = models.TextField(blank=True)
    had_discrepancy = models.BooleanField(default=False)
    client_created_at = models.DateTimeField(
        null=True, blank=True, help_text="When the client recorded the action offline."
    )
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "sync_operation"
        ordering = ["-processed_at"]
        indexes = [
            models.Index(fields=["branch", "op_type"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.op_type} {self.client_uuid} [{self.status}]"


class StockDiscrepancy(models.Model):
    """A recorded mismatch between expected and actual stock.

    Created when a synced sale would drive branch stock below zero — the sale is
    still recorded (never dropped) and stock is clamped at zero, but the shortfall
    is logged here for a manager to reconcile against a physical count. Truth is
    the physical shelf, not either device's optimistic view.
    """

    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.CASCADE,
        related_name="stock_discrepancies",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="stock_discrepancies",
    )
    expected_quantity = models.DecimalField(
        max_digits=15, decimal_places=2,
        help_text="Stock the server held before applying the operation.",
    )
    requested_quantity = models.DecimalField(
        max_digits=15, decimal_places=2,
        help_text="Quantity the operation tried to remove.",
    )
    oversold_quantity = models.DecimalField(
        max_digits=15, decimal_places=2,
        help_text="How far past available stock the operation went (requested - expected).",
    )
    source_operation = models.ForeignKey(
        SyncOperation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="discrepancies",
    )
    resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_discrepancies",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stock_discrepancy"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["branch", "resolved"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.product_id} @ {self.branch_id}: oversold {self.oversold_quantity} "
            f"({'resolved' if self.resolved else 'open'})"
        )
