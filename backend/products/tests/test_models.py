from django.test import TestCase
from products.models import Product, PricingTier
from decimal import Decimal
from datetime import date, timedelta

class ProductModelTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name="Test Product",
            description="Test Description",
            category="pain_relief",
            price=100.00,
            stock_quantity=50,
            reorder_threshold=10,
            expiry_date=date.today() + timedelta(days=365)
        )

    def test_product_creation(self):
        """Test that a product is created correctly."""
        self.assertEqual(self.product.name, "Test Product")
        self.assertEqual(self.product.price, 100.00)
        self.assertTrue(self.product.is_active)

    def test_in_stock_property(self):
        """Test the in_stock property."""
        self.assertTrue(self.product.in_stock)
        self.product.stock_quantity = 0
        self.product.save()
        self.assertFalse(self.product.in_stock)

    def test_is_low_stock_property(self):
        """Test the is_low_stock property."""
        self.assertFalse(self.product.is_low_stock)
        self.product.stock_quantity = 10
        self.product.save()
        self.assertTrue(self.product.is_low_stock)

    def test_expiry_status(self):
        """Test the expiry_status property."""
        self.assertEqual(self.product.expiry_status, "valid")
        
        # Test expired
        self.product.expiry_date = date.today() - timedelta(days=1)
        self.product.save()
        self.assertEqual(self.product.expiry_status, "expired")

class PricingTierModelTest(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name="Tiered Product",
            category="pain_relief",
            price=0, # Will be updated by pricing tier
            stock_quantity=100
        )
        self.pricing_tier = PricingTier.objects.create(
            product=self.product,
            buying_price=Decimal("100.00")
        )

    def test_price_calculation(self):
        """Test that wholesale and retail prices are calculated correctly."""
        # Wholesale: 100 * 1.1 = 110.00
        # Retail: 100 * 1.5 = 150.00
        self.assertEqual(self.pricing_tier.wholesale_price, Decimal("110.00"))
        self.assertEqual(self.pricing_tier.retail_price, Decimal("150.00"))
        
        # Check that product price was updated to retail price
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal("150.00"))
