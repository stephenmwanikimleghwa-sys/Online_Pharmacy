from django.db import models
from django.conf import settings
from products.models import Product
from django.core.validators import MinValueValidator
from django.utils import timezone

class Prescription(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('dispensed', 'Dispensed'),
        ('cancelled', 'Cancelled'),
    ]
    
    patient_name = models.CharField(max_length=255)
    patient_age = models.PositiveIntegerField(null=True, blank=True)
    prescriber_name = models.CharField(max_length=255)
    prescription_date = models.DateField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
           related_name='inventory_verified_prescriptions'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_prescriptions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Prescription for {self.patient_name} ({self.status})"

class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='prescription_items'
    )
    prescribed_quantity = models.PositiveIntegerField()
    dispensed_quantity = models.PositiveIntegerField(default=0)
    dosage_instructions = models.TextField()
    
    def __str__(self):
        return f"{self.product.name} - {self.prescribed_quantity} units"

class Dispensation(models.Model):
    SALE_TYPE_CHOICES = [
        ('prescription', 'Prescription'),
        ('otc', 'Over The Counter'),
    ]
    
    sale_type = models.CharField(max_length=20, choices=SALE_TYPE_CHOICES)
    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='dispensations'
    )
    patient_name = models.CharField(max_length=255, blank=True)  # For OTC sales
    dispensed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='dispensations'
    )
    dispensed_at = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    notes = models.TextField(blank=True)
    shift_info = models.JSONField(default=dict)  # For tracking pharmacist shifts
    
    def __str__(self):
        return f"Dispensation #{self.id} by {self.dispensed_by.username}"
    
    def save(self, *args, **kwargs):
        if not self.shift_info:
            current_hour = timezone.now().hour
            shift = (
                'morning' if 6 <= current_hour < 14
                else 'afternoon' if 14 <= current_hour < 22
                else 'night'
            )
            self.shift_info = {
                'shift': shift,
                'timestamp': timezone.now().isoformat()
            }
        super().save(*args, **kwargs)

class DispensationItem(models.Model):
    dispensation = models.ForeignKey(
        Dispensation,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='dispensation_items'
    )
    quantity = models.PositiveIntegerField()
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    batch_number = models.CharField(max_length=50, blank=True)
    expiry_date = models.DateField()  # Copied from product at time of dispensing
    
    def save(self, *args, **kwargs):
        if not self.total_price:
            self.total_price = self.quantity * self.price_per_unit
            
        # Create stock log entry
        from products.models import StockLog
        StockLog.objects.create(
            product=self.product,
            previous_quantity=self.product.stock_quantity,
            new_quantity=self.product.stock_quantity - self.quantity,
            change_amount=-self.quantity,
            change_type='sale',
            reason=f'Dispensed in {self.dispensation.sale_type} sale #{self.dispensation.id}',
            logged_by=self.dispensation.dispensed_by
        )
        
        # Update product stock
        self.product.stock_quantity -= self.quantity
        self.product.save()
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity} @ {self.price_per_unit} each"