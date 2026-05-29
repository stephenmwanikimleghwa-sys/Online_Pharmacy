from django.db import models
from django.conf import settings
from django.db import transaction
from products.models import Product, BranchStock, StockLog

class ProductReturn(models.Model):
    RETURN_TYPES = [
        ('INWARD', 'Inward (Customer to Pharmacy)'),
        ('OUTWARD', 'Outward (Pharmacy to Supplier)'),
    ]

    return_type = models.CharField(max_length=10, choices=RETURN_TYPES, verbose_name="Return Type")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="returns")
    branch = models.ForeignKey('users.Branch', on_delete=models.PROTECT, related_name="returns")
    quantity = models.PositiveIntegerField(verbose_name="Quantity")
    reason = models.TextField(verbose_name="Reason")
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="handled_returns")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Timestamp")

    class Meta:
        db_table = "product_returns"
        verbose_name = "Product Return"
        verbose_name_plural = "Product Returns"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.return_type} Return of {self.quantity} x {self.product.name}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        with transaction.atomic():
            super().save(*args, **kwargs)
            
            if is_new:
                branch_stock, _ = BranchStock.objects.select_for_update().get_or_create(
                    product=self.product, 
                    branch=self.branch,
                    defaults={'quantity': 0, 'reorder_level': 0}
                )
                
                prev_stock = branch_stock.quantity
                
                if self.return_type == 'INWARD':
                    # Customer returning to pharmacy -> stock increases
                    branch_stock.quantity += self.quantity
                    log_type = 'RETURN_IN'
                else:
                    # Pharmacy returning to supplier -> stock decreases
                    if branch_stock.quantity < self.quantity:
                        raise ValueError(f"Cannot return {self.quantity}. Only {branch_stock.quantity} in stock.")
                    branch_stock.quantity -= self.quantity
                    log_type = 'RETURN_OUT'
                    
                branch_stock.save()
                
                StockLog.objects.create(
                    product=self.product,
                    branch=self.branch,
                    user=self.handled_by,
                    action_type=log_type,
                    quantity_changed=self.quantity,
                    previous_stock=prev_stock,
                    new_stock=branch_stock.quantity,
                    reference=f"Return #{self.id}: {self.reason}"
                )
