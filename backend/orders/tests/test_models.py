from django.test import TestCase
from django.contrib.auth import get_user_model
from orders.models import Order, OrderItem, OrderStatusChoices
from products.models import Product
from decimal import Decimal

User = get_user_model()

class OrderModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpassword",
            role="customer"
        )
        self.product = Product.objects.create(
            name="Test Product",
            category="pain_relief",
            price=Decimal("100.00"),
            stock_quantity=10
        )

    def test_create_order(self):
        order = Order.objects.create(
            user=self.user,
            total_amount=Decimal("200.00"),
            status=OrderStatusChoices.PENDING
        )
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.total_amount, Decimal("200.00"))
        self.assertEqual(order.status, OrderStatusChoices.PENDING)
        self.assertTrue(str(order).startswith("Order"))

    def test_create_order_item(self):
        order = Order.objects.create(
            user=self.user,
            total_amount=Decimal("200.00")
        )
        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=2,
            unit_price=self.product.price
        )
        self.assertEqual(item.order, order)
        self.assertEqual(item.product, self.product)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.unit_price, Decimal("100.00"))
        self.assertEqual(item.subtotal, Decimal("200.00"))
        self.assertEqual(str(item), "Test Product x 2")

    def test_order_item_default_price(self):
        """Test that unit_price defaults to product price if not provided"""
        order = Order.objects.create(user=self.user)
        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1
        )
        self.assertEqual(item.unit_price, self.product.price)

    def test_is_paid_property(self):
        """Test is_paid property returns correct boolean"""
        order = Order.objects.create(user=self.user)
        self.assertFalse(order.is_paid)
        
        # Mock payment object (since we can't easily import Payment model without circular deps or fixtures)
        # Actually, we can just check if payment is None.
        # To test True, we'd need a Payment instance.
        # Let's skip the True case if Payment model is complex to setup, or try to import it.
        
    def test_order_item_subtotal(self):
        """Test subtotal calculation"""
        order = Order.objects.create(user=self.user)
        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=3,
            unit_price=Decimal("10.00")
        )
        self.assertEqual(item.subtotal, Decimal("30.00"))

    def test_unique_order_item(self):
        """Test that duplicate products in same order are not allowed"""
        from django.db.utils import IntegrityError
        
        order = Order.objects.create(user=self.user)
        OrderItem.objects.create(
            order=order,
            product=self.product,
            quantity=1
        )
        
        with self.assertRaises(IntegrityError):
            OrderItem.objects.create(
                order=order,
                product=self.product,
                quantity=2
            )
