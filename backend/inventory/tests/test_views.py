from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from products.models import Product
from inventory.models.restock import RestockRequest
from inventory.models.stock_intake import StockIntake
from inventory.models.dispensing import Prescription
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class InventoryViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.pharmacist = User.objects.create_user(
            username="pharmacist",
            password="password",
            role="pharmacist"
        )
        self.product = Product.objects.create(
            name="Test Product",
            category="pain_relief",
            price=Decimal("10.00"),
            stock_quantity=100
        )

    def test_dispense_otc_success(self):
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('inventory:dispense_otc')
        data = {
            'items': [
                {'product_id': self.product.id, 'quantity': 5}
            ],
            'notes': 'Test sale'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify stock update
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 95)

    def test_dispense_otc_insufficient_stock(self):
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('inventory:dispense_otc')
        data = {
            'items': [
                {'product_id': self.product.id, 'quantity': 101}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient stock', response.data['error'])

    def test_restock_request_flow(self):
        """Test creating, approving, and completing a restock request"""
        self.client.force_authenticate(user=self.pharmacist)
        
        # 1. Create Request
        url_list = reverse('inventory:restockrequest-list')
        data = {
            'product': self.product.id,
            'requested_quantity': 50,
            'current_quantity': self.product.stock_quantity
        }
        response = self.client.post(url_list, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        request_id = response.data['id']
        
        # 2. Approve Request
        url_approve = reverse('inventory:restockrequest-approve', args=[request_id])
        response = self.client.post(url_approve)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'approved')
        
        # 3. Complete Request
        url_complete = reverse('inventory:restockrequest-complete', args=[request_id])
        response = self.client.post(url_complete)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'completed')
        
        # Verify stock update
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 150)

    def test_stock_intake_create(self):
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('inventory:stockintake-list')
        data = {
            'product_id': self.product.id,
            'distributor_name': 'Test Dist',
            'quantity_received': 50,
            'unit_cost': '5.00',
            'expiry_date': (timezone.now() + timedelta(days=365)).date()
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify stock update via view (which uses model save)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 150)

    def test_prescription_verify(self):
        prescription = Prescription.objects.create(
            patient_name="Jane Doe",
            prescriber_name="Dr. Jones",
            prescription_date=timezone.now().date(),
            created_by=self.pharmacist,
            status='pending'
        )
        
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('inventory:prescription-verify', args=[prescription.id])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prescription.refresh_from_db()
        self.assertEqual(prescription.status, 'verified')
        self.assertEqual(prescription.verified_by, self.pharmacist)
