from django.db import models

class ProductReturn(models.Model):
    """
    Model representing returns (inwards from customers or outwards to suppliers).
    """
    RETURN_TYPES = [
        ('INWARD', 'Return Inward (From Customer)'),
        ('OUTWARD', 'Return Outward (To Supplier)'),
    ]

    return_type = models.CharField(
        max_length=20,
        choices=RETURN_TYPES,
        verbose_name="Return Type"
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='returns',
        verbose_name="Product"
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Quantity")
    reason = models.CharField(max_length=255, verbose_name="Reason for Return")
    supplier = models.ForeignKey(
        'inventory.Supplier',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='returns',
        verbose_name="Supplier (For Outwards)"
    )
    customer = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='returns',
        verbose_name="Customer (For Inwards)"
    )
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.PROTECT,
        related_name='product_returns',
        verbose_name="Branch"
    )
    processed_by = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='processed_returns',
        verbose_name="Processed By"
    )
    timestamp = models.DateTimeField(verbose_name="Timestamp")
    legacy_id = models.IntegerField(null=True, blank=True, verbose_name="Legacy ID")

    class Meta:
        db_table = "product_returns"
        verbose_name = "Product Return"
        verbose_name_plural = "Product Returns"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.get_return_type_display()} of {self.product.name} ({self.quantity})"
