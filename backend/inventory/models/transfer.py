from django.db import models
from django.conf import settings

class InterBranchTransfer(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]

    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='transfers')
    source_branch = models.ForeignKey('users.Branch', on_delete=models.CASCADE, related_name='transfers_out')
    destination_branch = models.ForeignKey('users.Branch', on_delete=models.CASCADE, related_name='transfers_in')
    quantity = models.PositiveIntegerField()
    
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transfers_requested')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers_approved')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inter_branch_transfer'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.quantity} of {self.product.name} from {self.source_branch.name} to {self.destination_branch.name}"

    def save(self, *args, **kwargs):
        from django.db import transaction
        from products.models import BranchStock, StockLog

        is_new = self.pk is None
        old_status = None
        if not is_new:
            old_instance = InterBranchTransfer.objects.get(pk=self.pk)
            old_status = old_instance.status

        with transaction.atomic():
            super().save(*args, **kwargs)

            # If status changes to completed, perform the transfer
            if self.status == 'completed' and old_status != 'completed':
                # Decrement source
                source_stock, _ = BranchStock.objects.get_or_create(
                    product=self.product,
                    branch=self.source_branch,
                    defaults={'quantity': 0}
                )
                prev_source = source_stock.quantity
                source_stock.quantity -= self.quantity
                source_stock.save()

                StockLog.objects.create(
                    product=self.product,
                    branch=self.source_branch,
                    previous_quantity=prev_source,
                    new_quantity=source_stock.quantity,
                    change_amount=-self.quantity,
                    change_type='adjustment',
                    reason=f"Transfer Out to {self.destination_branch.name} (Ref: {self.id})",
                    logged_by=self.approved_by or self.requested_by
                )

                # Increment destination
                dest_stock, _ = BranchStock.objects.get_or_create(
                    product=self.product,
                    branch=self.destination_branch,
                    defaults={'quantity': 0}
                )
                prev_dest = dest_stock.quantity
                dest_stock.quantity += self.quantity
                dest_stock.save()

                StockLog.objects.create(
                    product=self.product,
                    branch=self.destination_branch,
                    previous_quantity=prev_dest,
                    new_quantity=dest_stock.quantity,
                    change_amount=self.quantity,
                    change_type='adjustment',
                    reason=f"Transfer In from {self.source_branch.name} (Ref: {self.id})",
                    logged_by=self.approved_by or self.requested_by
                )
