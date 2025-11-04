from django.db import models
from django.core.validators import MinValueValidator

from django.contrib.auth import get_user_model

User = get_user_model()


class CategoryChoices(models.TextChoices):
    PAIN_RELIEF = "pain_relief", "Pain Relief"
    ANTIBIOTICS = "antibiotics", "Antibiotics"
    VITAMINS = "vitamins", "Vitamins & Supplements"
    CHRONIC_CARE = "chronic_care", "Chronic Care"
    DERMATOLOGY = "dermatology", "Dermatology"
    OTHER = "other", "Other"


class Product(models.Model):
    """
    Model representing a pharmaceutical product.
    Associated with a specific pharmacy, with pricing, stock, and categorization.
    """

    name = models.CharField(max_length=255, verbose_name="Product Name")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    category = models.CharField(
        max_length=20, choices=CategoryChoices.choices, verbose_name="Category"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Price (KES)",
    )
    stock_quantity = models.PositiveIntegerField(
        default=0, verbose_name="Stock Quantity"
    )
    reorder_threshold = models.PositiveIntegerField(
        default=10, verbose_name="Reorder Threshold"
    )
    supplier = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Supplier"
    )
    expiry_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Expiry Date"
    )
    image = models.ImageField(
        upload_to="product_images/", blank=True, null=True, verbose_name="Product Image"
    )
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    is_featured = models.BooleanField(default=False, verbose_name="Is Featured")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "products"
        verbose_name = "Product"
        verbose_name_plural = "Products"
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["category"]),
            models.Index(fields=["price"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["name", "category"]),  # For search
        ]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} - KSh {self.price}"

    def save(self, *args, **kwargs):
        # Ensure price is positive
        if self.price < 0:
            raise ValueError("Price cannot be negative.")
        super().save(*args, **kwargs)

    @property
    def in_stock(self):
        return self.stock_quantity > 0

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.reorder_threshold
        
    @property
    def expiry_status(self):
        if not self.expiry_date:
            return "unknown"
        
        from django.utils import timezone
        import datetime
        
        today = timezone.now().date()
        expiry = self.expiry_date
        days_until_expiry = (expiry - today).days
        
        if days_until_expiry < 0:
            return "expired"
        elif days_until_expiry <= 30:
            return "expiring_soon"
        elif days_until_expiry <= 90:
            return "near_expiry"
        else:
            return "valid"
            
    @property
    def days_until_expiry(self):
        if not self.expiry_date:
            return None
            
        from django.utils import timezone
        today = timezone.now().date()
        return (self.expiry_date - today).days


class StockLog(models.Model):
    """
    Model to track inventory changes for products.
    Logs stock adjustments, supports low-stock alerts, and reorder thresholds.
    """

    CHANGE_TYPES = [
        ("restock", "Restock"),
        ("sale", "Sale"),
        ("adjustment", "Adjustment"),
        ("expiry", "Expiry"),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="stock_logs",
        verbose_name="Product",
    )
    previous_quantity = models.PositiveIntegerField(verbose_name="Previous Quantity")
    new_quantity = models.PositiveIntegerField(verbose_name="New Quantity")
    change_amount = models.IntegerField(
        verbose_name="Change Amount"
    )  # Positive for add, negative for deduct
    change_type = models.CharField(
        max_length=20, choices=CHANGE_TYPES, verbose_name="Change Type"
    )
    reason = models.CharField(max_length=255, blank=True, verbose_name="Reason")
    logged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_logs",
        verbose_name="Logged By",
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Timestamp")
    alert_triggered = models.BooleanField(
        default=False, verbose_name="Low-Stock Alert Triggered"
    )

    class Meta:
        db_table = "stock_logs"
        verbose_name = "Stock Log"
        verbose_name_plural = "Stock Logs"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["product", "timestamp"]),
            models.Index(fields=["change_type"]),
            models.Index(fields=["alert_triggered"]),
        ]

    def __str__(self):
        return f"{self.product.name}: {self.change_amount} ({self.change_type}) at {self.timestamp}"

    def save(self, *args, **kwargs):
        # Trigger alert if new quantity is below reorder threshold
        if (
            self.new_quantity < self.product.reorder_threshold
            and self.change_amount < 0
        ):
            self.alert_triggered = True
        super().save(*args, **kwargs)
