from datetime import date
from decimal import Decimal

from django.db import models
from products.models import Product
from .supplier import Supplier


class Batch(models.Model):
    """
    Batch-level stock with expiry tracking (FEFO).
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="batches",
        verbose_name="Product",
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.PROTECT,
        related_name="batches",
        null=True,
        blank=True,
        verbose_name="Branch",
    )
    batch_number = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Batch Number",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="batches",
        verbose_name="Supplier",
    )
    quantity_received = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0"),
        verbose_name="Quantity Received",
    )
    quantity_remaining = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0"),
        verbose_name="Quantity Remaining",
    )
    expiry_date = models.DateField(verbose_name="Expiry Date")
    received_date = models.DateField(auto_now_add=True, verbose_name="Received Date")
    cost_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Cost Price",
    )
    is_clearance = models.BooleanField(default=False, verbose_name="Is Clearance")
    clearance_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Clearance Price",
    )
    is_active = models.BooleanField(default=True, verbose_name="Is Active")

    class Meta:
        db_table = "batches"
        verbose_name = "Batch"
        verbose_name_plural = "Batches"
        ordering = ["expiry_date"]
        indexes = [
            models.Index(fields=["product", "expiry_date"]),
            models.Index(fields=["product", "branch", "expiry_date"]),
            models.Index(fields=["batch_number"]),
        ]

    def __str__(self):
        label = self.batch_number or f"Batch #{self.pk}"
        return f"{self.product.name} - {label} (Exp: {self.expiry_date})"

    @property
    def quantity(self):
        """Backward compatibility for legacy code paths."""
        return int(self.quantity_remaining)

    @quantity.setter
    def quantity(self, value):
        self.quantity_remaining = Decimal(str(value))

    @property
    def is_expired(self):
        return self.expiry_date < date.today()

    @property
    def days_to_expiry(self):
        return (self.expiry_date - date.today()).days

    @property
    def status(self):
        days = self.days_to_expiry
        if days < 0:
            return "EXPIRED"
        if days <= 7:
            return "CRITICAL"
        if days <= 30:
            return "WARNING"
        if days <= 90:
            return "CAUTION"
        return "OK"
