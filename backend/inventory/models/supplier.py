from django.db import models

class Supplier(models.Model):
    """
    Model representing a supplier or distributor of pharmaceutical products.
    """
    name = models.CharField(max_length=255, verbose_name="Supplier Name")
    contact_person = models.CharField(max_length=255, blank=True, null=True, verbose_name="Contact Person")
    email = models.EmailField(blank=True, null=True, verbose_name="Email Address")
    phone = models.CharField(max_length=50, blank=True, null=True, verbose_name="Phone Number")
    address = models.TextField(blank=True, null=True, verbose_name="Address")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "suppliers"
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"
        ordering = ["name"]

    def __str__(self):
        return self.name
