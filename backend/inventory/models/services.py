from django.db import models

class ClinicalService(models.Model):
    """
    Model representing clinical or non-product services billed by the pharmacy.
    """
    name = models.CharField(max_length=255, verbose_name="Service Name")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    price = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Price")
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.CASCADE,
        related_name='clinical_services',
        verbose_name="Branch"
    )
    is_active = models.BooleanField(default=True, verbose_name="Is Active")

    class Meta:
        db_table = "clinical_services"
        verbose_name = "Clinical Service"
        verbose_name_plural = "Clinical Services"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} - KSh {self.price}"


class SoldService(models.Model):
    """
    Model representing a record of a clinical service provided to a customer.
    """
    service = models.ForeignKey(
        ClinicalService,
        on_delete=models.PROTECT,
        related_name='sales',
        verbose_name="Service"
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1, verbose_name="Quantity")
    total_price = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Total Price")
    payment_mode = models.CharField(max_length=50, verbose_name="Payment Mode")
    served_by = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='services_provided',
        verbose_name="Served By"
    )
    customer = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='services_received',
        verbose_name="Customer"
    )
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.PROTECT,
        related_name='sold_services',
        verbose_name="Branch"
    )
    timestamp = models.DateTimeField(verbose_name="Timestamp")
    legacy_id = models.IntegerField(null=True, blank=True, verbose_name="Legacy ID")

    class Meta:
        db_table = "sold_services"
        verbose_name = "Sold Service"
        verbose_name_plural = "Sold Services"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.service.name} sold to {self.customer.username if self.customer else 'Walk-in'} at {self.timestamp}"
