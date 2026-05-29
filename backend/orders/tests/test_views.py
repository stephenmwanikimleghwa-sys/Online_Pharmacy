from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from products.models import Product
from orders.models import Order, OrderItem, OrderStatusChoices
from decimal import Decimal

User = get_user_model()

class OrderViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.pharmacist = User.objects.create_user(
            username="pharmacist",
            password="testpassword",
            role="pharmacist",
            can_process_sales=True,
            can_manage_inventory=True
        )
        self.customer = User.objects.create_user(
            username="customer",
            password="password",
            role="customer"
        )
        
        # Create product
        self.product = Product.objects.create(
            name="Paracetamol",
            category="pain_relief",
            price=Decimal("10.00"),
            stock_quantity=100,
            is_active=True
        )

    def test_quick_sale_success(self):
        """Test successful quick sale by pharmacist"""
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('orders:quick_sale')
        data = {
            'items': [
                {'id': self.product.id, 'quantity': 2}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total_amount'], 20.0)
        
        # Verify stock deduction
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 98)
        
        # Verify order creation
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(order.status, OrderStatusChoices.DELIVERED)

    def test_quick_sale_insufficient_stock(self):
        """Test quick sale fails if stock is insufficient"""
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('orders:quick_sale')
        data = {
            'items': [
                {'id': self.product.id, 'quantity': 101}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient stock', response.data['error'])

    def test_quick_sale_permission(self):
        """Test customer cannot perform quick sale"""
        self.client.force_authenticate(user=self.customer)
        url = reverse('orders:quick_sale')
        data = {
            'items': [{'id': self.product.id, 'quantity': 1}]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_my_orders_list(self):
        """Test listing own orders"""
        # Create an order for customer
        order = Order.objects.create(user=self.customer, total_amount=Decimal("50.00"))
        
        self.client.force_authenticate(user=self.customer)
        url = reverse('orders:my_orders')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], order.id)

    def test_create_order_authenticated(self):
        """Test authenticated user can create an order"""
        self.client.force_authenticate(user=self.customer)
        url = reverse('orders:list_create')
        data = {
            'items': [
                {
                    'product_id': self.product.id, 
                    'quantity': 1,
                    'unit_price': '10.00'
                }
            ],
            'delivery_address': '123 Test St'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(Order.objects.first().total_amount, Decimal("10.00"))

    def test_update_order_status(self):
        """Test updating order status by pharmacist"""
        order = Order.objects.create(
            user=self.customer, 
            total_amount=Decimal("50.00"),
            status=OrderStatusChoices.PENDING
        )
        
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('orders:detail', args=[order.id])
        data = {'status': OrderStatusChoices.CONFIRMED}
        
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        order.refresh_from_db()
        self.assertEqual(order.status, OrderStatusChoices.CONFIRMED)

