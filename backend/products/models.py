from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from typing import Union, Optional

from django.contrib.auth import get_user_model

User = get_user_model()


class CategoryChoices(models.TextChoices):
    PAIN_RELIEF = "pain_relief", "Pain Relief"
    ANTIBIOTICS = "antibiotics", "Antibiotics"
    VITAMINS = "vitamins", "Vitamins & Supplements"
    CHRONIC_CARE = "chronic_care", "Chronic Care"
    DERMATOLOGY = "dermatology", "Dermatology"
    OTHER = "other", "Other"


class PricingTierChoices(models.TextChoices):
    """Pricing tier options."""
    RETAIL = "retail", "Retail (1.33× markup)"
    WHOLESALE = "wholesale", "Wholesale (1.15× markup)"


class Product(models.Model):
    """
    Model representing a pharmaceutical product.
    Associated with a specific pharmacy, with pricing, stock, and categorization.
    """

    name = models.CharField(max_length=255, verbose_name="Product Name")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    category = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="Category"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Price (KES)",
    )
    
    DOSAGE_FORM_CHOICES = [
        ("tablet", "Tablet"),
        ("capsule", "Capsule"),
        ("syrup", "Syrup"),
        ("injection", "Injection"),
        ("cream", "Cream/Ointment"),
        ("drops", "Drops"),
        ("inhaler", "Inhaler"),
        ("solution", "Solution"),
        ("powder", "Powder"),
        ("other", "Other"),
    ]
    
    dosage_form = models.CharField(
        max_length=20, 
        choices=DOSAGE_FORM_CHOICES, 
        default="other",
        verbose_name="Dosage Form"
    )
    manufacturer = models.CharField(
        max_length=255, 
        blank=True, 
        null=True, 
        verbose_name="Manufacturer"
    )
    strength = models.CharField(
        max_length=100, 
        blank=True, 
        null=True, 
        verbose_name="Strength (e.g., 500mg)"
    )
    
    stock_quantity = models.PositiveIntegerField(
        default=0, 
        verbose_name="Global Stock (DEPRECATED)",
        help_text="Deprecated: Use BranchStock instead."
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
    vat_obligation = models.CharField(
        max_length=50, blank=True, null=True, verbose_name="VAT Obligation"
    )
    shelf_location = models.CharField(
        max_length=100, blank=True, null=True, verbose_name="Shelf Location"
    )
    image = models.ImageField(
        upload_to="product_images/", blank=True, null=True, verbose_name="Product Image"
    )
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    is_featured = models.BooleanField(default=False, verbose_name="Is Featured")
    pharmacy = models.ForeignKey(
        "users.Pharmacy",
        on_delete=models.CASCADE,
        related_name="products",
        verbose_name="Pharmacy",
        null=True,  # Temporarily nullable for migration
        blank=True
    )
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
            models.Index(fields=["pharmacy"]),
            models.Index(fields=["stock_quantity"]),
        ]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} - KSh {self.price}"

    def save(self, *args, **kwargs) -> None:
        """
        Save the product instance.
        Ensures price is non-negative.
        """
        # Ensure price is positive
        if self.price < 0:
            raise ValueError("Price cannot be negative.")
        super().save(*args, **kwargs)

    @property
    def in_stock(self) -> bool:
        """Check if product is in stock."""
        return self.stock_quantity > 0

    @property
    def is_low_stock(self) -> bool:
        """Check if product stock is below reorder threshold."""
        return self.stock_quantity <= self.reorder_threshold
        
    @property
    def expiry_status(self) -> str:
        """
        Determine the expiry status of the product.
        
        Returns:
            str: 'expired', 'expiring_soon', 'near_expiry', 'valid', or 'unknown'.
        """
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
    def days_until_expiry(self) -> Optional[int]:
        """Calculate days until the product expires."""
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
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_logs",
        verbose_name="Branch",
        help_text="The branch where this stock change occurred"
    )
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
            models.Index(fields=["timestamp"]),
        ]

    def __str__(self):
        return f"{self.product.name}: {self.change_amount} ({self.change_type}) at {self.timestamp}"

    def save(self, *args, **kwargs) -> None:
        """
        Save the stock log.
        Triggers a low-stock alert if applicable.
        """
        # Trigger alert if new quantity is below reorder threshold
        if (
            self.new_quantity < self.product.reorder_threshold
            and self.change_amount < 0
        ):
            self.alert_triggered = True
        super().save(*args, **kwargs)


class PricingTier(models.Model):
    """
    Model to define pricing tiers for products.
    Allows different prices for wholesale vs retail buyers.
    
    Pricing formula:
    - Wholesale: Buying Price × 1.15 (15% markup)
    - Retail: Buying Price × 1.33 (33% markup)
    """
    
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='pricing_tier',
        help_text='The product this pricing applies to'
    )
    
    buying_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Cost price from distributor (Base Price)'
    )
    
    wholesale_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        editable=False,
        help_text='Wholesale price (Buying Price × 1.15)'
    )
    
    retail_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        editable=False,
        help_text='Retail price (Buying Price × 1.33)'
    )
    
    minimum_wholesale_quantity = models.PositiveIntegerField(
        default=10,
        help_text='Minimum quantity required to qualify for wholesale price'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this pricing tier is currently active'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pricing_tier'
        verbose_name = 'Pricing Tier'
        verbose_name_plural = 'Pricing Tiers'

    def save(self, *args, **kwargs) -> None:
        """Automatically calculate wholesale and retail prices."""
        # Wholesale: Buying Price × 1.15
        self.wholesale_price = self.buying_price * Decimal('1.15')
        # Retail: Buying Price × 1.33
        self.retail_price = self.buying_price * Decimal('1.33')

        # Update the product's main price to retail price
        if self.product:
            self.product.price = self.retail_price
            self.product.save(update_fields=['price'])

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} - BP: KSh {self.buying_price}, WS: KSh {self.wholesale_price}, Retail: KSh {self.retail_price}"

    def get_price_for_tier(self, tier: str) -> Decimal:
        """Get price for a specific tier."""
        if tier == 'wholesale':
            return self.wholesale_price
        elif tier == 'retail':
            return self.retail_price
        return self.retail_price  # Default to retail


class BranchStock(models.Model):
    """
    Model representing stock levels for a product at a specific branch.
    Replaces the global Product.stock_quantity.
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='branch_stocks',
        help_text='The product being stocked'
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.CASCADE,
        related_name='branch_stocks',
        help_text='The branch holding this stock'
    )
    quantity = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Stock Quantity",
        help_text="Current stock level at this branch"
    )
    reorder_level = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Reorder Level",
        help_text="Minimum acceptable stock level before reordering"
    )
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'branch_stock'
        verbose_name = 'Branch Stock'
        verbose_name_plural = 'Branch Stocks'
        unique_together = ('product', 'branch')
        indexes = [
            models.Index(fields=['product', 'branch']),
            models.Index(fields=['quantity']),
        ]

    def __str__(self):
        return f"{self.product.name} @ {self.branch.name}: {self.quantity}"

    @property
    def is_low_stock(self) -> bool:
        """Check if stock at this branch is below the reorder level."""
        return self.quantity <= self.reorder_level
