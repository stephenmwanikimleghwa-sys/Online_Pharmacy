from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product

User = get_user_model()


class StockIntake(models.Model):
    """
    Record of stock received from distributors.
    Provides an audit trail for incoming inventory to prevent disputes about received medicines.
    """
    
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='stock_intakes',
        help_text='The product/medicine received'
    )
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='stock_intakes',
        verbose_name='Branch',
        help_text='The branch that received this stock.'
    )
    distributor_name = models.CharField(
        max_length=255,
        help_text='Name of the distributor or supplier'
    )
    quantity_received = models.PositiveIntegerField(
        help_text='Number of units received'
    )
    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Cost per unit from distributor'
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Total cost (quantity × unit_cost)',
        editable=False
    )
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text='Expiry date of the batch'
    )
    batch_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Batch/lot number from distributor'
    )
    received_date = models.DateTimeField(
        auto_now_add=True,
        help_text='Date and time when stock was recorded'
    )
    received_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='stock_intakes_received'
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Additional notes (e.g., condition of stock, issues)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stock_intake'
        verbose_name = 'Stock Intake'
        verbose_name_plural = 'Stock Intakes'
        ordering = ['-received_date']
        indexes = [
            models.Index(fields=['product', '-received_date']),
            models.Index(fields=['distributor_name', '-received_date']),
            models.Index(fields=['received_date']),
        ]

    def save(self, *args, **kwargs):
        """Calculate total_cost before saving and update inventory."""
        is_new = self.pk is None
        self.total_cost = self.quantity_received * self.unit_cost
        
        super().save(*args, **kwargs)
        
        if is_new:
            # Create Batch if batch_number and expiry_date are provided
            if self.batch_number and self.expiry_date:
                from inventory.models.batch import Batch
                from inventory.models.supplier import Supplier
                
                # Try to find or create supplier
                supplier, _ = Supplier.objects.get_or_create(
                    name=self.distributor_name
                )
                
                Batch.objects.create(
                    product=self.product,
                    batch_number=self.batch_number,
                    supplier=supplier,
                    quantity=self.quantity_received,
                    expiry_date=self.expiry_date
                )

            # Keep a simple "next expiry" on the Product for quick UI display.
            # If multiple batches exist, we store the earliest expiry date.
            if self.expiry_date:
                if not self.product.expiry_date or self.expiry_date < self.product.expiry_date:
                    self.product.expiry_date = self.expiry_date

            # Update product stock (Legacy support + Total stock)
            self.product.stock_quantity += self.quantity_received
            self.product.save()
            
            # Create stock log
            from products.models import StockLog
            StockLog.objects.create(
                product=self.product,
                previous_quantity=self.product.stock_quantity - self.quantity_received,
                new_quantity=self.product.stock_quantity,
                change_amount=self.quantity_received,
                change_type='restock',
                reason=f'Stock intake from {self.distributor_name} (Ref: {self.id})',
                logged_by=self.received_by
            )

    def __str__(self):
        return f"{self.product.name} - {self.quantity_received} units from {self.distributor_name} ({self.received_date.date()})"
