from decimal import Decimal

from django.conf import settings
from django.db import models


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("SENT", "Sent"),
        ("RECEIVED", "Received"),
        ("CANCELLED", "Cancelled"),
    ]

    order_number = models.CharField(max_length=20, unique=True, editable=False)
    supplier = models.ForeignKey(
        "inventory.Supplier",
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="purchase_orders_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expected_delivery = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    cancellation_reason = models.TextField(blank=True, default="")
    total_estimated_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0"),
    )

    class Meta:
        db_table = "purchase_orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order_number} — {self.supplier.name}"

    def recalculate_total(self):
        total = sum(
            (item.quantity_ordered or Decimal("0")) * (item.estimated_unit_price or Decimal("0"))
            for item in self.items.all()
        )
        self.total_estimated_cost = total
        self.save(update_fields=["total_estimated_cost"])

    @staticmethod
    def generate_order_number():
        from django.utils import timezone

        year = timezone.now().year
        prefix = f"PO-{year}-"
        last = (
            PurchaseOrder.objects.filter(order_number__startswith=prefix)
            .order_by("-order_number")
            .first()
        )
        if last:
            try:
                seq = int(last.order_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="purchase_order_items",
    )
    quantity_ordered = models.DecimalField(max_digits=15, decimal_places=2)
    estimated_unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    actual_unit_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
    )
    quantity_received = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "purchase_order_items"

    def __str__(self):
        return f"{self.product.name} x {self.quantity_ordered}"
