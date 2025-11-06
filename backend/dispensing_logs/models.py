from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product
from orders.models import Order

User = get_user_model()

class DispensingLog(models.Model):
    """
    Model for tracking medicine dispensing activities.
    This log is created automatically when medicines are dispensed through quick sales.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,  # Don't delete logs if product is deleted
        related_name='dispensing_logs',
        verbose_name='Product'
    )
    quantity = models.PositiveIntegerField(
        verbose_name='Quantity Dispensed'
    )
    dispensed_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,  # Don't delete logs if user is deleted
        related_name='dispensing_logs',
        verbose_name='Dispensed By'
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,  # Don't delete logs if order is deleted
        related_name='dispensing_logs',
        verbose_name='Related Order'
    )
    previous_stock = models.PositiveIntegerField(
        verbose_name='Stock Before Dispensing'
    )
    new_stock = models.PositiveIntegerField(
        verbose_name='Stock After Dispensing'
    )
    total_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        verbose_name='Total Cost (KES)'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Additional Notes'
    )

    class Meta:
        db_table = 'dispensing_logs'
        verbose_name = 'Dispensing Log'
        verbose_name_plural = 'Dispensing Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['product', 'created_at']),
            models.Index(fields=['dispensed_by', 'created_at']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.quantity} units - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
