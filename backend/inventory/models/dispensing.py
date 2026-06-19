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
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='prescriptions',
        verbose_name='Branch',
        help_text='The branch where this prescription was created/verified.'
    )
    
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
           related_name='inventory_verified_prescriptions'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
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
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='dispensations',
        verbose_name='Branch',
        help_text='The branch where this sale/dispensation occurred.'
    )
    patient_name = models.CharField(max_length=255, blank=True)  # For OTC sales
    dispensed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='dispensations'
    )
    dispensed_at = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    
    PAYMENT_MODES = [
        ('CASH', 'Cash'),
        ('MPESA_TILL', 'M-Pesa Till'),
        ('EQUITY_TILL', 'Equity Till'),
        ('NATIONAL_BANK', 'National Bank'),
        ('CREDIT', 'Credit'),
    ]
    payment_mode = models.CharField(max_length=50, choices=PAYMENT_MODES, default='CASH', verbose_name='Payment Mode')
    
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='customer_dispensations',
        help_text='Registered customer for credit tracking'
    )
    
    PRICING_TIERS = [
        ('RETAIL', 'Retail'),
        ('WHOLESALE', 'Wholesale'),
    ]
    pricing_tier = models.CharField(max_length=20, choices=PRICING_TIERS, default='RETAIL')
    
    discount = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True, verbose_name='Discount')
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

    class Meta:
        verbose_name = 'Dispensation'
        verbose_name_plural = 'Dispensations'
        indexes = [
            # Used by dashboard: filter(branch=..., dispensed_at__date=today)
            models.Index(fields=['branch', 'dispensed_at'], name='disp_branch_date_idx'),
            # Used by date-range reports
            models.Index(fields=['dispensed_at'], name='disp_date_idx'),
            # Used by customer history lookups
            models.Index(fields=['customer'], name='disp_customer_idx'),
        ]
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
    expiry_date = models.DateField(null=True, blank=True)  # Copied from product at time of dispensing
    
    def save(self, *args, **kwargs):
        if not self.total_price:
            self.total_price = self.quantity * self.price_per_unit
            
        from django.db import transaction
        from products.models import StockLog, BranchStock
        
        with transaction.atomic():
            branch = self.dispensation.branch
            if not branch:
                raise ValueError("Dispensation must have a branch to update stock.")
                
            branch_stock, _ = BranchStock.objects.get_or_create(
                product=self.product,
                branch=branch,
                defaults={'quantity': 0}
            )
            
            previous_qty = branch_stock.quantity
            new_qty = previous_qty - self.quantity
            
            StockLog.objects.create(
                product=self.product,
                branch=branch,
                previous_quantity=previous_qty,
                new_quantity=new_qty,
                change_amount=-self.quantity,
                change_type='sale',
                reason=f'Dispensed in {self.dispensation.sale_type} sale #{self.dispensation.id}',
                logged_by=self.dispensation.dispensed_by
            )
            
            branch_stock.quantity = new_qty
            branch_stock.save()
            
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity} @ {self.price_per_unit} each"


class SaleReturn(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    dispensation = models.ForeignKey(
        Dispensation, 
        on_delete=models.CASCADE, 
        related_name='returns',
        help_text="The original sale being returned."
    )
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.PROTECT,
        related_name='sale_returns'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reason = models.TextField()
    total_refund = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='initiated_returns'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='approved_returns'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Return #{self.id} for Dispensation #{self.dispensation_id}"

class SaleReturnItem(models.Model):
    CONDITION_CHOICES = [
        ('sellable', 'Sellable (Restock)'),
        ('damaged', 'Damaged/Expired (Do Not Restock)'),
    ]

    return_record = models.ForeignKey(
        SaleReturn,
        on_delete=models.CASCADE,
        related_name='items'
    )
    dispensation_item = models.ForeignKey(
        DispensationItem,
        on_delete=models.CASCADE,
        related_name='returns'
    )
    quantity = models.PositiveIntegerField()
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='sellable')

    def __str__(self):
        return f"Return {self.quantity} of {self.dispensation_item.product.name}"