from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User, RoleChoices, Pharmacy
from products.models import Product, StockLog
from django.utils import timezone
from datetime import timedelta

class AnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create pharmacy
        self.pharmacy = Pharmacy.objects.create(name="Test Pharmacy")
        
        # Create admin
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='password123',
            role=RoleChoices.ADMIN,
            pharmacy=self.pharmacy
        )
        
        # Create products
        self.product_a = Product.objects.create(
            name="Product A",
            price=100,
            stock_quantity=5,  # Low stock
            reorder_threshold=10,
            pharmacy=self.pharmacy
        )
        self.product_b = Product.objects.create(
            name="Product B",
            price=200,
            stock_quantity=20,
            reorder_threshold=10,
            pharmacy=self.pharmacy
        )
        
        # Create stock logs (sales)
        # Product A sold 10 units
        StockLog.objects.create(
            product=self.product_a,
            previous_quantity=15,
            new_quantity=5,
            change_amount=-10,
            change_type='sale',
            logged_by=self.admin
        )
        # Product B sold 5 units
        StockLog.objects.create(
            product=self.product_b,
            previous_quantity=25,
            new_quantity=20,
            change_amount=-5,
            change_type='sale',
            logged_by=self.admin
        )

    def test_top_selling_products(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('reports:analytics-top-selling-products')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(len(data), 2)
        
        # Product A should be first (10 sold)
        self.assertEqual(data[0]['name'], "Product A")
        self.assertEqual(data[0]['value'], 10)
        
        # Product B should be second (5 sold)
        self.assertEqual(data[1]['name'], "Product B")
        self.assertEqual(data[1]['value'], 5)

    def test_low_stock_alerts(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('reports:analytics-low-stock-alerts')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], "Product A")
        self.assertEqual(data[0]['stock_quantity'], 5)
