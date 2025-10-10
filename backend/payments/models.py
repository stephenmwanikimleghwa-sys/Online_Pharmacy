from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from orders.models import Order


class PaymentMethodChoices(models.TextChoices):
    MPESA = "mpesa", "M-Pesa"
    STRIPE = "stripe", "Stripe"
    CASH_ON_DELIVERY = "cash_on_delivery", "Cash on Delivery"


class PaymentStatusChoices(models.TextChoices):
    INITIATED = "initiated", "Initiated"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


class Payment(models.Model):
    """
    Model representing a payment transaction for an order.
    Linked to an Order, with payment method, status, and transaction reference.
    """

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="+",
        verbose_name="Order",
    )
    method = models.CharField(
        max_length=20,
        choices=PaymentMethodChoices.choices,
        default=PaymentMethodChoices.MPESA,
        verbose_name="Payment Method",
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatusChoices.choices,
        default=PaymentStatusChoices.INITIATED,
        verbose_name="Status",
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name="Amount (KES)",
    )
    reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Transaction Reference",
    )
    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Transaction ID",
    )
    transaction_date = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Transaction Date",
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notes",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "payments"
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        indexes = [
            models.Index(fields=["order", "status"]),
            models.Index(fields=["method"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment for Order {self.order.id} - {self.method} ({self.status})"

    @property
    def is_successful(self):
        return self.status == PaymentStatusChoices.COMPLETED

    def save(self, *args, **kwargs):
        if self.status != getattr(self, "_previous_status", None):
            self.updated_at = timezone.now()
        super().save(*args, **kwargs)
