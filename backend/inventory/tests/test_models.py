from django.test import TestCase
from django.contrib.auth import get_user_model
from inventory.models.dispensing import Prescription, Dispensation, DispensationItem
from products.models import Product, StockLog
from decimal import Decimal
from django.utils import timezone

User = get_user_model()

class InventoryModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
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

    def test_create_prescription(self):
        prescription = Prescription.objects.create(
            patient_name="John Doe",
            prescriber_name="Dr. Smith",
            prescription_date=timezone.now().date(),
            created_by=self.user
        )
        self.assertEqual(prescription.status, 'pending')
        self.assertTrue(str(prescription).startswith("Prescription for John Doe"))

    def test_create_dispensation_otc(self):
        dispensation = Dispensation.objects.create(
            sale_type='otc',
            dispensed_by=self.user,
            total_amount=Decimal("20.00")
        )
        self.assertEqual(dispensation.sale_type, 'otc')
        self.assertIsNotNone(dispensation.shift_info)
        self.assertIn('shift', dispensation.shift_info)

    def test_dispensation_item_stock_update(self):
        dispensation = Dispensation.objects.create(
            sale_type='otc',
            dispensed_by=self.user,
            total_amount=Decimal("0.00") # Will be updated or irrelevant for this test
        )
        
        initial_stock = self.product.stock_quantity
        quantity = 5
        
        item = DispensationItem.objects.create(
            dispensation=dispensation,
            product=self.product,
            quantity=quantity,
            price_per_unit=self.product.price,
            expiry_date=timezone.now().date()
        )
        
        # Check stock update
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock - quantity)
        
        # Check stock log creation
        log = StockLog.objects.filter(product=self.product).last()
        self.assertIsNotNone(log)
        self.assertEqual(log.change_amount, -quantity)
        self.assertEqual(log.change_type, 'sale')

    def test_stock_intake_updates_inventory(self):
        from inventory.models.stock_intake import StockIntake
        initial_stock = self.product.stock_quantity
        quantity = 50
        
        StockIntake.objects.create(
            product=self.product,
            distributor_name="Test Dist",
            quantity_received=quantity,
            unit_cost=Decimal("5.00"),
            received_by=self.user
        )
        
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, initial_stock + quantity)

    def test_prescription_verification(self):
        prescription = Prescription.objects.create(
            patient_name="Jane Doe",
            prescriber_name="Dr. Jones",
            prescription_date=timezone.now().date(),
            created_by=self.user,
            status='pending'
        )
        
        # Verify
        prescription.status = 'verified'
        prescription.verified_by = self.user
        prescription.save()
        
        self.assertEqual(prescription.status, 'verified')
        self.assertEqual(prescription.verified_by, self.user)
