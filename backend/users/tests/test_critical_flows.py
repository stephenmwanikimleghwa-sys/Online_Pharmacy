"""
Comprehensive Integration Tests for Critical User Flows
Tests complete workflows to ensure system works end-to-end
"""

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
import json

from users.models import User, RoleChoices, Pharmacy
from products.models import Product, CategoryChoices
from orders.models import Order, OrderItem
from payments.models import Payment

User = get_user_model()


class CriticalUserFlowTests(APITestCase):
    """
    Integration tests for critical user workflows.
    These tests simulate real pharmacy operations.
    """

    def setUp(self):
        """Set up test data for all tests."""
        self.client = APIClient()
        
        # Create pharmacy
        self.pharmacy = Pharmacy.objects.create(
            name="Test Pharmacy",
            address="Test Address",
            contact_phone="+254700000000",
            license_number="LIC001"
        )
        
        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            username="test_admin",
            password="admin123",
            email="admin@test.com",
            role=RoleChoices.ADMIN,
            is_staff=True,
            is_superuser=True
        )
        
        self.pharmacist_user = User.objects.create_user(
            username="test_pharmacist",
            password="pharm123",
            email="pharmacist@test.com",
            role=RoleChoices.PHARMACIST,
            pharmacy=self.pharmacy
        )
        
        self.cashier_user = User.objects.create_user(
            username="test_cashier",
            password="cash123",
            email="cashier@test.com",
            role=RoleChoices.CASHIER,
            pharmacy=self.pharmacy
        )
        
        self.customer_user = User.objects.create_user(
            username="test_customer",
            password="cust123",
            email="customer@test.com",
            role=RoleChoices.CUSTOMER
        )
        
        # Create test products
        self.product1 = Product.objects.create(
            name="Aspirin 500mg",
            category=CategoryChoices.PAIN_RELIEF,
            price=Decimal("50.00"),
            stock_quantity=100,
            pharmacy=self.pharmacy,
            is_active=True
        )
        
        self.product2 = Product.objects.create(
            name="Paracetamol 1000mg",
            category=CategoryChoices.PAIN_RELIEF,
            price=Decimal("75.00"),
            stock_quantity=50,
            pharmacy=self.pharmacy,
            is_active=True,
            is_featured=True
        )

    # ============ Authentication Flow Tests ============

    def test_user_login_with_valid_credentials(self):
        """Test: User can log in with valid credentials."""
        response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'test_customer')

    def test_user_login_with_invalid_password(self):
        """Test: User cannot log in with wrong password."""
        response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'wrongpassword'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)

    def test_user_login_with_nonexistent_username(self):
        """Test: User cannot log in with non-existent username."""
        response = self.client.post('/api/auth/login/', {
            'username': 'nonexistent_user',
            'password': 'password123'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_profile_retrieval(self):
        """Test: Logged-in user can retrieve their profile."""
        # First, login
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Now fetch profile
        response = self.client.get('/api/auth/profile/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'test_customer')
        self.assertEqual(response.data['email'], 'customer@test.com')

    # ============ Product Management Tests ============

    def test_customer_can_view_products(self):
        """Test: Customer can view available products."""
        response = self.client.get('/api/products/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 2)

    def test_customer_can_view_featured_products(self):
        """Test: Featured products endpoint returns marked products."""
        response = self.client.get('/api/products/featured/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should contain at least the featured product we created
        product_names = [p['name'] for p in response.data['data']]
        self.assertIn('Paracetamol 1000mg', product_names)

    def test_pharmacist_can_create_product(self):
        """Test: Pharmacist can create new products."""
        # Login as pharmacist
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_pharmacist',
            'password': 'pharm123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create product
        response = self.client.post('/api/products/', {
            'name': 'Vitamin C 1000mg',
            'category': CategoryChoices.VITAMINS,
            'price': '100.00',
            'stock_quantity': 200,
            'dosage_form': 'tablet',
            'manufacturer': 'Test Manufacturer'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Vitamin C 1000mg')

    def test_customer_cannot_create_product(self):
        """Test: Customer cannot create products (permission check)."""
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.post('/api/products/', {
            'name': 'Unauthorized Product',
            'category': CategoryChoices.VITAMINS,
            'price': '100.00',
            'stock_quantity': 200
        }, format='json')
        
        self.assertIn(response.status_code, [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_401_UNAUTHORIZED
        ])

    def test_search_products(self):
        """Test: User can search products by name."""
        response = self.client.get('/api/products/?search=Aspirin')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product_names = [p['name'] for p in response.data['results']]
        self.assertIn('Aspirin 500mg', product_names)

    # ============ Order Flow Tests ============

    def test_customer_can_create_order(self):
        """Test: Customer can create an order with products."""
        # Login
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create order
        response = self.client.post('/api/orders/', {
            'items': [
                {
                    'product': self.product1.id,
                    'quantity': 2
                }
            ]
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)

    def test_order_cannot_exceed_stock(self):
        """Test: Cannot order quantity greater than available stock."""
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Product only has 50 in stock
        response = self.client.post('/api/orders/', {
            'items': [
                {
                    'product': self.product2.id,
                    'quantity': 100  # More than available
                }
            ]
        }, format='json')
        
        # Should fail due to insufficient stock
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT
        ])

    def test_customer_can_view_own_orders(self):
        """Test: Customer can view their orders."""
        # Login
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create an order first
        order_response = self.client.post('/api/orders/', {
            'items': [
                {
                    'product': self.product1.id,
                    'quantity': 1
                }
            ]
        }, format='json')
        
        # View orders
        response = self.client.get('/api/orders/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see at least the order we just created
        self.assertGreater(len(response.data), 0)

    # ============ Role-Based Access Control Tests ============

    def test_admin_can_access_admin_users_endpoint(self):
        """Test: Admin can access admin users list."""
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_admin',
            'password': 'admin123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get('/api/auth/admin/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_customer_cannot_access_admin_endpoint(self):
        """Test: Customer is denied access to admin endpoints."""
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get('/api/auth/admin/users/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_protected_endpoint(self):
        """Test: Unauthenticated requests cannot access protected endpoints."""
        response = self.client.get('/api/auth/profile/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ============ Data Validation Tests ============

    def test_product_price_must_be_non_negative(self):
        """Test: Product price validation prevents negative prices."""
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_pharmacist',
            'password': 'pharm123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.post('/api/products/', {
            'name': 'Invalid Product',
            'category': CategoryChoices.VITAMINS,
            'price': '-50.00',  # Negative price
            'stock_quantity': 100
        }, format='json')
        
        # Should be rejected
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST
        ])

    def test_order_quantity_must_be_positive(self):
        """Test: Order quantity validation prevents zero or negative quantities."""
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.post('/api/orders/', {
            'items': [
                {
                    'product': self.product1.id,
                    'quantity': 0  # Invalid
                }
            ]
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_username_prevention(self):
        """Test: Cannot create user with duplicate username."""
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_admin',
            'password': 'admin123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Try to create user with existing username
        response = self.client.post('/api/auth/admin/users/create/', {
            'username': 'test_customer',  # Already exists
            'password': 'newpass123',
            'email': 'newemail@test.com'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ============ Concurrency & Data Integrity Tests ============

    def test_multiple_orders_do_not_conflict(self):
        """Test: Two concurrent orders don't create conflicts."""
        # Login customer 1
        login1 = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        token1 = login1.data['access']
        
        # Create customer 2
        customer2 = User.objects.create_user(
            username='customer2',
            password='pass123',
            role=RoleChoices.CUSTOMER
        )
        
        # Login customer 2
        login2 = self.client.post('/api/auth/login/', {
            'username': 'customer2',
            'password': 'pass123'
        }, format='json')
        
        token2 = login2.data['access']
        
        # Customer 1 creates order
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token1}')
        order1 = self.client.post('/api/orders/', {
            'items': [{'product': self.product1.id, 'quantity': 1}]
        }, format='json')
        
        # Customer 2 creates order
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token2}')
        order2 = self.client.post('/api/orders/', {
            'items': [{'product': self.product1.id, 'quantity': 1}]
        }, format='json')
        
        # Both should succeed
        self.assertEqual(order1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(order2.status_code, status.HTTP_201_CREATED)

    # ============ Error Handling Tests ============

    def test_nonexistent_product_returns_404(self):
        """Test: Requesting non-existent product returns 404."""
        response = self.client.get('/api/products/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_order_id_returns_404(self):
        """Test: Requesting non-existent order returns 404."""
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_customer',
            'password': 'cust123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get('/api/orders/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_required_field_returns_400(self):
        """Test: Missing required fields returns 400 error."""
        login_response = self.client.post('/api/auth/login/', {
            'username': 'test_pharmacist',
            'password': 'pharm123'
        }, format='json')
        
        token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Missing required 'name' field
        response = self.client.post('/api/products/', {
            'category': CategoryChoices.VITAMINS,
            'price': '100.00'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
