from django.contrib.auth.models import AbstractUser
from django.db import models


class RoleChoices(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    PHARMACIST = "pharmacist", "Pharmacist"
    ADMIN = "admin", "Admin"
    CASHIER = "cashier", "Cashier"
    AUDITOR = "auditor", "Auditor"


class Pharmacy(models.Model):
    """
    Model representing a pharmacy entity.
    """
    name = models.CharField(max_length=255, verbose_name="Pharmacy Name")
    address = models.TextField(verbose_name="Address")
    contact_phone = models.CharField(max_length=20, verbose_name="Contact Phone")
    license_number = models.CharField(max_length=50, verbose_name="License Number", unique=True)
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pharmacies"
        verbose_name = "Pharmacy"
        verbose_name_plural = "Pharmacies"

    def __str__(self):
        return self.name


class Branch(models.Model):
    """
    A physical branch of a pharmacy (e.g., 'CBD Branch', 'Westlands Branch').
    Stock, sales, dispensing, and restock data are scoped per branch.
    The medicine catalog (Product) is shared across all branches of a pharmacy.
    """
    pharmacy = models.ForeignKey(
        Pharmacy,
        on_delete=models.CASCADE,
        related_name='branches',
        verbose_name='Pharmacy'
    )
    name = models.CharField(max_length=255, verbose_name='Branch Name')  # e.g. "CBD Branch"
    address = models.TextField(verbose_name='Address')
    contact_phone = models.CharField(max_length=20, verbose_name='Contact Phone')
    license_number = models.CharField(
        max_length=50, blank=True, verbose_name='Branch Licence Number'
    )
    is_active = models.BooleanField(default=True, verbose_name='Is Active')
    is_headquarters = models.BooleanField(
        default=False,
        verbose_name='Is Headquarters',
        help_text='Mark if this is the main/head office branch.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'branches'
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
        ordering = ['name']
        indexes = [
            models.Index(fields=['pharmacy']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.pharmacy.name} — {self.name}"


class User(AbstractUser):
    role = models.CharField(
        max_length=20, choices=RoleChoices.choices, default=RoleChoices.CUSTOMER
    )
    pharmacy = models.ForeignKey(
        Pharmacy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name="Pharmacy",
        help_text="The pharmacy this user belongs to (for pharmacists/staff)."
    )
    branch = models.ForeignKey(
        'Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name='Branch',
        help_text='The branch this staff member is primarily assigned to.'
    )
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False, help_text="Designates whether the user must change their password upon login.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["pharmacy"]),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def save(self, *args, **kwargs):
        # Ensure email is lowercase for consistency
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)


class PharmacyDocument(models.Model):
    """
    Model representing legal documents, licenses, and permits for a pharmacy.
    """
    DOCUMENT_TYPES = [
        ("license", "Pharmacy License"),
        ("permit", "Operational Permit"),
        ("insurance", "Insurance Certificate"),
        ("compliance", "Compliance Certificate"),
        ("other", "Other Document"),
    ]

    pharmacy = models.ForeignKey(
        Pharmacy,
        on_delete=models.CASCADE,
        related_name="documents",
        verbose_name="Pharmacy"
    )
    document_type = models.CharField(
        max_length=20, 
        choices=DOCUMENT_TYPES, 
        default="other",
        verbose_name="Document Type"
    )
    title = models.CharField(max_length=255, verbose_name="Document Title")
    file = models.FileField(
        upload_to="pharmacy_documents/",
        verbose_name="Document File"
    )
    expiry_date = models.DateField(blank=True, null=True, verbose_name="Expiry Date")
    is_verified = models.BooleanField(default=False, verbose_name="Is Verified")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pharmacy_documents"
        verbose_name = "Pharmacy Document"
        verbose_name_plural = "Pharmacy Documents"
        ordering = ["-uploaded_at"]
        indexes = [
            models.Index(fields=["pharmacy", "document_type"]),
            models.Index(fields=["expiry_date"]),
        ]

    def __str__(self):
        return f"{self.pharmacy.name} - {self.get_document_type_display()} ({self.title})"

    @property
    def is_expired(self):
        if not self.expiry_date:
            return False
        from django.utils import timezone
        return self.expiry_date < timezone.now().date()
