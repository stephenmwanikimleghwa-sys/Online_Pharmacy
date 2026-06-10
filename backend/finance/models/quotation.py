from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class Quotation(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('converted', 'Converted to Sale'),
        ('expired', 'Expired'),
    ]

    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.PROTECT,
        related_name='quotations',
        verbose_name='Branch'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_quotations'
    )
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_email = models.EmailField(blank=True)
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    valid_until = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "quotations"
        verbose_name = "Quotation"
        verbose_name_plural = "Quotations"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Quotation {self.id} for {self.customer_name}"

    def save(self, *args, **kwargs):
        if not self.valid_until:
            self.valid_until = timezone.now().date() + timedelta(days=30)
        super().save(*args, **kwargs)

class QuotationItem(models.Model):
    quotation = models.ForeignKey(
        Quotation,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.PROTECT,
        related_name='quotation_items'
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "quotation_items"

    def __str__(self):
        return f"{self.quantity} x {self.product.name} (Quotation {self.quotation_id})"

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        super().save(*args, **kwargs)
