from django.db import models
from products.models import Product
from .supplier import Supplier

class Batch(models.Model):
    """
    Model representing a specific batch of products.
    Tracks expiry dates and quantity for specific lots.
    """
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        related_name="batches",
        verbose_name="Product"
    )
    batch_number = models.CharField(max_length=100, verbose_name="Batch Number")
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="batches",
        verbose_name="Supplier"
    )
    quantity = models.PositiveIntegerField(default=0, verbose_name="Quantity")
    expiry_date = models.DateField(verbose_name="Expiry Date")
    received_date = models.DateField(auto_now_add=True, verbose_name="Received Date")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")

    class Meta:
        db_table = "batches"
        verbose_name = "Batch"
        verbose_name_plural = "Batches"
        ordering = ["expiry_date"]
        indexes = [
            models.Index(fields=["product", "expiry_date"]),
            models.Index(fields=["batch_number"]),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.batch_number} (Exp: {self.expiry_date})"
