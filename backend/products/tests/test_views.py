from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from products.models import Product

User = get_user_model()

class ProductTests(APITestCase):
    def setUp(self):
        # Create users
        self.admin = User.objects.create_superuser(
            username='admin', email='admin@test.com', password='password123', role='admin'
        )
        self.pharmacist = User.objects.create_user(
            username='pharmacist', email='pharm@test.com', password='password123', role='pharmacist', can_process_sales=True, can_manage_inventory=True
        )
        self.customer = User.objects.create_user(
            username='customer', email='cust@test.com', password='password123', role='customer'
        )

        # Create product
        self.product = Product.objects.create(
            name="Test Product",
            category="pain_relief",
            price=100.00,
            stock_quantity=50
        )
        
        self.list_url = reverse('product-list')
        self.detail_url = reverse('product-detail', kwargs={'pk': self.product.pk})

    def test_list_products_public(self):
        """Ensure anyone can list products."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_create_product_admin(self):
        """Ensure admin can create products."""
        self.client.force_authenticate(user=self.admin)
        data = {
            "name": "New Product",
            "category": "antibiotics",
            "price": "200.00",
            "stock_quantity": 20,
            "description": "New Description"
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 2)

    def test_create_product_pharmacist(self):
        """Ensure pharmacist can create products."""
        self.client.force_authenticate(user=self.pharmacist)
        data = {
            "name": "Pharm Product",
            "category": "vitamins",
            "price": "50.00",
            "stock_quantity": 100
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_product_customer_denied(self):
        """Ensure customer cannot create products."""
        self.client.force_authenticate(user=self.customer)
        data = {
            "name": "Illegal Product",
            "category": "other",
            "price": "10.00",
            "stock_quantity": 1
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_product_unauthenticated_denied(self):
        """Ensure unauthenticated user cannot create products."""
        data = {
            "name": "Anon Product",
            "category": "other",
            "price": "10.00",
            "stock_quantity": 1
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
