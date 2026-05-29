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

from users.models import Branch
from inventory.models.supplier import Supplier

User = get_user_model()

class InventoryViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        from users.models import Pharmacy
        self.pharmacy = Pharmacy.objects.create(name="Main Pharmacy", address="123 Street", contact_phone="1234567890", license_number="12345")
        self.branch = Branch.objects.create(pharmacy=self.pharmacy, name="Main Branch", address="123 Street", contact_phone="1234567890")
        self.pharmacist = User.objects.create_user(
            username="pharmacist",
            password="password",
            role="pharmacist",
            branch=self.branch,
            can_process_sales=True,
            can_manage_inventory=True
        )
        self.product = Product.objects.create(
            name="Test Product",
            category="pain_relief",
            price=Decimal("10.00")
        )
        from products.models import BranchStock
        self.branch_stock = BranchStock.objects.create(
            product=self.product,
            branch=self.branch,
            quantity=100
        )

    def test_dispense_otc_success(self):
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('inventory:dispense-otc')
        data = {
            'items': [
                {'product_id': self.product.id, 'quantity': 5}
            ],
            'notes': 'Test sale'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify stock update
        self.branch_stock.refresh_from_db()
        self.assertEqual(self.branch_stock.quantity, 95)

    def test_dispense_otc_insufficient_stock(self):
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('inventory:dispense-otc')
        data = {
            'items': [
                {'product_id': self.product.id, 'quantity': 101}
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient stock', str(response.data.get('error', '')))

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
        self.branch_stock.refresh_from_db()
        self.assertEqual(self.branch_stock.quantity, 150)

    def test_stock_intake_create(self):
        supplier = Supplier.objects.create(name="Test Supplier", email="supplier@test.com")
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('inventory:stockintake-list')
        data = {
            'product_id': self.product.id,
            'supplier': supplier.id,
            'quantity_received': 50,
            'unit_cost': '5.00',
            'payment_status': 'PAID',
            'expiry_date': (timezone.now() + timedelta(days=365)).date().isoformat()
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify stock update via view (which uses model save)
        self.branch_stock.refresh_from_db()
        self.assertEqual(self.branch_stock.quantity, 150)

    def test_prescription_verify(self):
        prescription = Prescription.objects.create(
            patient_name="Jane Doe",
            prescriber_name="Dr. Jones",
            prescription_date=timezone.now().date(),
            created_by=self.pharmacist,
            status='pending'
        )
        
        self.client.force_authenticate(user=self.pharmacist)
        url = reverse('inventory:prescription-detail', args=[prescription.id]) + 'verify/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prescription.refresh_from_db()
        self.assertEqual(prescription.status, 'verified')
        self.assertEqual(prescription.verified_by, self.pharmacist)
