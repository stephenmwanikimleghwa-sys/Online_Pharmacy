from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from .models import Product


class PricingTierChoices(models.TextChoices):
    """Pricing tier options."""
    RETAIL = "retail", "Retail (1.33× markup)"
    WHOLESALE = "wholesale", "Wholesale (1.15× markup)"


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
    
    pricing_mode = models.CharField(
        max_length=10,
        choices=[("auto", "Auto-calculate"), ("manual", "Manual pricing")],
        default="auto",
        help_text="Whether to auto-calculate wholesale/retail prices from buying price."
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
        help_text='Wholesale price (Buying Price × 1.15)'
    )
    
    retail_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
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

    def save(self, *args, **kwargs):
        """Automatically calculate wholesale and retail prices if in auto mode."""
        from decimal import Decimal
        if self.pricing_mode == "auto":
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

    def get_price_for_tier(self, tier):
        """Get price for a specific tier."""
        if tier == 'wholesale':
            return self.wholesale_price
        elif tier == 'retail':
            return self.retail_price
        return self.retail_price  # Default to retail
