from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal
from products.models import Product

User = get_user_model()


def _is_agrovet_branch(branch):
    if not branch:
        return False
    name = (branch.name or "").upper()
    return branch.branch_type == "AGROVET" or "PEAKFARM" in name


class StockIntake(models.Model):
    """
    Record of stock received from distributors.
    Provides an audit trail for incoming inventory to prevent disputes about received medicines.
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="stock_intakes",
        help_text="The product/medicine received",
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="stock_intakes",
        verbose_name="Branch",
        help_text="The branch that received this stock.",
    )
    supplier = models.ForeignKey(
        "inventory.Supplier",
        on_delete=models.PROTECT,
        related_name="stock_intakes",
        help_text="Supplier of the stock",
    )
    PAYMENT_STATUS_CHOICES = [
        ("PAID", "Paid"),
        ("CREDIT", "Credit"),
        ("PARTIAL", "Partial"),
    ]
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="PAID",
        help_text="Payment status for this intake",
    )
    invoice_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Invoice or reference number from the supplier",
    )
    quantity_received = models.PositiveIntegerField(
        help_text="Number of units received",
    )
    unit_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Cost per unit from distributor",
    )
    total_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Total cost (quantity × unit_cost)",
        editable=False,
    )
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Expiry date of the batch",
    )
    batch_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Batch/lot number from distributor",
    )
    received_date = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when stock was recorded",
    )
    received_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_intakes_received",
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes (e.g., condition of stock, issues)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stock_intake"
        verbose_name = "Stock Intake"
        verbose_name_plural = "Stock Intakes"
        ordering = ["-received_date"]
        indexes = [
            models.Index(fields=["product", "-received_date"]),
            models.Index(fields=["supplier", "-received_date"]),
            models.Index(fields=["received_date"]),
        ]

    def clean(self):
        from datetime import date

        if not self.expiry_date and not _is_agrovet_branch(self.branch):
            raise ValidationError(
                {"expiry_date": "Expiry date is required for pharmacy products."}
            )
        if self.expiry_date and self.expiry_date < date.today():
            raise ValidationError(
                {
                    "expiry_date": (
                        f"Cannot receive expired stock. Expiry date {self.expiry_date} "
                        "has already passed. Return this stock to the supplier."
                    )
                }
            )

    def save(self, *args, **kwargs):
        """Calculate total_cost before saving and update inventory."""
        is_new = self.pk is None
        self.total_cost = Decimal(self.quantity_received) * Decimal(self.unit_cost)

        from django.db import transaction
        from products.models import StockLog, BranchStock

        if is_new and not _is_agrovet_branch(self.branch) and not self.expiry_date:
            raise ValueError("Expiry date is required for pharmacy products")

        with transaction.atomic():
            super().save(*args, **kwargs)

            if is_new:
                branch = self.branch
                if not branch:
                    raise ValueError("StockIntake must have a branch to update stock.")

                if self.expiry_date:
                    from inventory.models.batch import Batch

                    Batch.objects.create(
                        product=self.product,
                        branch=branch,
                        batch_number=self.batch_number or f"INTAKE-{self.pk}",
                        supplier=self.supplier,
                        quantity_received=Decimal(self.quantity_received),
                        quantity_remaining=Decimal(self.quantity_received),
                        expiry_date=self.expiry_date,
                        cost_price=self.unit_cost,
                    )

                    if (
                        not self.product.expiry_date
                        or self.expiry_date < self.product.expiry_date
                    ):
                        self.product.expiry_date = self.expiry_date
                        self.product.save(update_fields=["expiry_date"])

                branch_stock, _ = BranchStock.objects.get_or_create(
                    product=self.product,
                    branch=branch,
                    defaults={"quantity": 0},
                )

                if self.payment_status == "CREDIT" and not getattr(
                    self, "_skip_credit", False
                ):
                    from inventory.models.supplier import SupplierCreditTransaction

                    self.supplier.balance += self.total_cost
                    self.supplier.save(update_fields=["balance"])

                    SupplierCreditTransaction.objects.create(
                        supplier=self.supplier,
                        transaction_type="PURCHASE_ON_CREDIT",
                        amount=self.total_cost,
                        balance_after=self.supplier.balance,
                        description=(
                            f"Stock Intake #{self.pk} - {self.quantity_received} units "
                            f"of {self.product.name}"
                        ),
                        invoice_number=self.invoice_number,
                        created_by=self.received_by,
                    )

                previous_qty = branch_stock.quantity
                new_qty = previous_qty + self.quantity_received

                StockLog.objects.create(
                    product=self.product,
                    branch=branch,
                    previous_quantity=previous_qty,
                    new_quantity=new_qty,
                    change_amount=self.quantity_received,
                    change_type="restock",
                    reason=f"Stock intake from {self.supplier.name} (Ref: {self.id})",
                    logged_by=self.received_by,
                )

                branch_stock.quantity = new_qty
                branch_stock.save()

    def __str__(self):
        return (
            f"{self.product.name} - {self.quantity_received} units from "
            f"{self.supplier.name} ({self.received_date.date()})"
        )
