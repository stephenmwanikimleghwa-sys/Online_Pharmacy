from django.db import models
from django.conf import settings
from .finance import CashFlow
from users.models import Branch

class ClinicalService(models.Model):
    name = models.CharField(max_length=255, verbose_name="Service Name")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Price")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "clinical_services"
        verbose_name = "Clinical Service"
        verbose_name_plural = "Clinical Services"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.price})"


class SoldService(models.Model):
    service = models.ForeignKey(ClinicalService, on_delete=models.PROTECT, related_name="sales")
    patient_name = models.CharField(max_length=255, verbose_name="Patient Name")
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="sold_services")
    sold_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="sold_services")
    payment_mode = models.CharField(
        max_length=50, 
        choices=[
            ('CASH', 'Cash'),
            ('MPESA_TILL', 'M-Pesa Till'),
            ('EQUITY_TILL', 'Equity Till'),
            ('NATIONAL_BANK', 'National Bank'),
        ],
        verbose_name="Payment Mode"
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Timestamp")

    class Meta:
        db_table = "sold_services"
        verbose_name = "Sold Service"
        verbose_name_plural = "Sold Services"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.service.name} to {self.patient_name} on {self.timestamp}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # Create a cashflow entry automatically
            CashFlow.objects.create(
                netflow=self.service.price,
                paymentmode=self.payment_mode,
                explanation=f"Service Sold: {self.service.name} to {self.patient_name}",
                branch=self.branch,
                timestamp=self.timestamp
            )
