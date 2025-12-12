from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User, RoleChoices, Pharmacy
from products.models import Product

class PharmacyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create pharmacies
        self.pharmacy_a = Pharmacy.objects.create(
            name="Pharmacy A",
            license_number="PHARM-A"
        )
        self.pharmacy_b = Pharmacy.objects.create(
            name="Pharmacy B",
            license_number="PHARM-B"
        )
        
        # Create users
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='password123',
            role=RoleChoices.ADMIN
        )
        self.pharmacist_a = User.objects.create_user(
            username='pharm_a',
            email='pharma@test.com',
            password='password123',
            role=RoleChoices.PHARMACIST,
            pharmacy=self.pharmacy_a
        )
        self.pharmacist_b = User.objects.create_user(
            username='pharm_b',
            email='pharmb@test.com',
            password='password123',
            role=RoleChoices.PHARMACIST,
            pharmacy=self.pharmacy_b
        )
        
        # Create products
        self.product_a = Product.objects.create(
            name="Product A",
            price=100,
            stock_quantity=10,
            pharmacy=self.pharmacy_a
        )
        self.product_b = Product.objects.create(
            name="Product B",
            price=200,
            stock_quantity=20,
            pharmacy=self.pharmacy_b
        )

    def test_admin_can_list_pharmacies(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('users:pharmacy-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 2)

    def test_pharmacist_can_view_own_pharmacy(self):
        self.client.force_authenticate(user=self.pharmacist_a)
        url = reverse('users:pharmacy-detail', args=[self.pharmacy_a.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Pharmacy A")

    def test_pharmacist_cannot_view_other_pharmacy(self):
        self.client.force_authenticate(user=self.pharmacist_a)
        url = reverse('users:pharmacy-detail', args=[self.pharmacy_b.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_inventory_isolation(self):
        # Pharmacist A should only see Product A in inventory list
        self.client.force_authenticate(user=self.pharmacist_a)
        url = reverse('inventory:inventory_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product_ids = [p['id'] for p in response.data['products']]
        self.assertIn(self.product_a.id, product_ids)
        self.assertNotIn(self.product_b.id, product_ids)

    def test_product_creation_assigns_pharmacy(self):
        self.client.force_authenticate(user=self.pharmacist_a)
        url = reverse('products:product-list')
        data = {
            "name": "New Product A",
            "price": 150,
            "category": "pain_relief",
            "stock_quantity": 50
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(name="New Product A")
        self.assertEqual(product.pharmacy, self.pharmacy_a)
