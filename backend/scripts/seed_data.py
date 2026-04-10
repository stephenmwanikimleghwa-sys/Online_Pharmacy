"""
Seed script to populate test data for pharmacy system.
Run with: python manage.py shell < scripts/seed_data.py
"""

from decimal import Decimal
from datetime import datetime, timedelta
from users.models import User, Pharmacy, RoleChoices
from products.models import Product, CategoryChoices

def seed_pharmacy():
    """Create a default pharmacy if it doesn't exist."""
    pharmacy, created = Pharmacy.objects.get_or_create(
        license_number="PHARM001",
        defaults={
            "name": "Transcounty Pharmacy",
            "address": "123 Health Street, Nairobi, Kenya",
            "contact_phone": "+254712345678",
            "is_active": True
        }
    )
    if created:
        print(f"✓ Created pharmacy: {pharmacy.name}")
    else:
        print(f"✓ Pharmacy already exists: {pharmacy.name}")
    return pharmacy

def seed_users(pharmacy):
    """Create test users with different roles."""
    users_data = [
        {
            "username": "admin_user",
            "email": "admin@pharmacy.local",
            "password": "AdminPass123",
            "role": RoleChoices.ADMIN,
            "is_staff": True,
            "is_superuser": True
        },
        {
            "username": "pharmacist_jane",
            "email": "jane@pharmacy.local",
            "password": "PharmPass123",
            "role": RoleChoices.PHARMACIST,
            "pharmacy": pharmacy,
            "first_name": "Jane",
            "last_name": "Kipchoge"
        },
        {
            "username": "cashier_bob",
            "email": "bob@pharmacy.local",
            "password": "CashPass123",
            "role": RoleChoices.CASHIER,
            "pharmacy": pharmacy,
            "first_name": "Robert",
            "last_name": "Mwangi"
        },
        {
            "username": "customer_alice",
            "email": "alice@example.com",
            "password": "CustPass123",
            "role": RoleChoices.CUSTOMER,
            "first_name": "Alice",
            "last_name": "Omondi"
        },
    ]
    
    for user_data in users_data:
        password = user_data.pop("password")
        username = user_data["username"]
        
        try:
            user, created = User.objects.get_or_create(
                username=username,
                defaults=user_data
            )
            if created:
                user.set_password(password)
                user.save()
                print(f"✓ Created user: {user.username} ({user.get_role_display()})")
            else:
                print(f"✓ User already exists: {user.username}")
        except Exception as e:
            print(f"✗ Error creating user {username}: {e}")

def seed_products(pharmacy):
    """Create a diverse set of pharmaceutical products."""
    products_data = [
        # Pain Relief
        {
            "name": "Aspirin 500mg",
            "category": CategoryChoices.PAIN_RELIEF,
            "price": Decimal("50.00"),
            "dosage_form": "tablet",
            "manufacturer": "Bayer",
            "strength": "500mg",
            "stock_quantity": 150,
            "reorder_threshold": 20,
            "supplier": "Nairobi Pharma Supplies",
            "is_featured": True
        },
        {
            "name": "Paracetamol 1000mg",
            "category": CategoryChoices.PAIN_RELIEF,
            "price": Decimal("75.00"),
            "dosage_form": "tablet",
            "manufacturer": "GlaxoSmithKline",
            "strength": "1000mg",
            "stock_quantity": 200,
            "reorder_threshold": 25,
            "supplier": "GSK Distribution",
            "is_featured": True
        },
        {
            "name": "Ibuprofen 400mg",
            "category": CategoryChoices.PAIN_RELIEF,
            "price": Decimal("85.00"),
            "dosage_form": "tablet",
            "manufacturer": "Pfizer",
            "strength": "400mg",
            "stock_quantity": 120,
            "reorder_threshold": 15,
            "supplier": "Pfizer Kenya"
        },
        {
            "name": "Diclofenac Cream 1%",
            "category": CategoryChoices.DERMATOLOGY,
            "price": Decimal("150.00"),
            "dosage_form": "cream",
            "manufacturer": "Novartis",
            "strength": "1%",
            "stock_quantity": 80,
            "reorder_threshold": 10,
            "supplier": "Novartis Distribution"
        },
        # Antibiotics
        {
            "name": "Amoxicillin 500mg",
            "category": CategoryChoices.ANTIBIOTICS,
            "price": Decimal("120.00"),
            "dosage_form": "capsule",
            "manufacturer": "Roche",
            "strength": "500mg",
            "stock_quantity": 100,
            "reorder_threshold": 20,
            "supplier": "Roche Pharmaceuticals",
            "is_featured": True
        },
        {
            "name": "Ciprofloxacin 500mg",
            "category": CategoryChoices.ANTIBIOTICS,
            "price": Decimal("200.00"),
            "dosage_form": "tablet",
            "manufacturer": "Bayer",
            "strength": "500mg",
            "stock_quantity": 90,
            "reorder_threshold": 15,
            "supplier": "Bayer HealthCare"
        },
        {
            "name": "Erythromycin Syrup",
            "category": CategoryChoices.ANTIBIOTICS,
            "price": Decimal("180.00"),
            "dosage_form": "syrup",
            "manufacturer": "Abbott",
            "strength": "125mg/5ml",
            "stock_quantity": 45,
            "reorder_threshold": 10,
            "supplier": "Abbott Laboratories"
        },
        # Vitamins
        {
            "name": "Vitamin C 1000mg",
            "category": CategoryChoices.VITAMINS,
            "price": Decimal("95.00"),
            "dosage_form": "tablet",
            "manufacturer": "Nature's Way",
            "strength": "1000mg",
            "stock_quantity": 300,
            "reorder_threshold": 40,
            "supplier": "International Wellness"
        },
        {
            "name": "Multivitamin Syrup",
            "category": CategoryChoices.VITAMINS,
            "price": Decimal("250.00"),
            "dosage_form": "syrup",
            "manufacturer": "Abbott",
            "strength": "Multi",
            "stock_quantity": 60,
            "reorder_threshold": 15,
            "supplier": "Abbott Laboratories",
            "is_featured": True
        },
        {
            "name": "Vitamin D3 2000IU",
            "category": CategoryChoices.VITAMINS,
            "price": Decimal("120.00"),
            "dosage_form": "capsule",
            "manufacturer": "Nutricost",
            "strength": "2000IU",
            "stock_quantity": 180,
            "reorder_threshold": 25,
            "supplier": "Global Health Supplies"
        },
        {
            "name": "Calcium + Vitamin D",
            "category": CategoryChoices.VITAMINS,
            "price": Decimal("280.00"),
            "dosage_form": "tablet",
            "manufacturer": "Citrical",
            "strength": "500mg+400IU",
            "stock_quantity": 140,
            "reorder_threshold": 20,
            "supplier": "Citrical Distribution"
        },
        # Chronic Care
        {
            "name": "Metformin 500mg",
            "category": CategoryChoices.CHRONIC_CARE,
            "price": Decimal("85.00"),
            "dosage_form": "tablet",
            "manufacturer": "Bristol-Myers Squibb",
            "strength": "500mg",
            "stock_quantity": 250,
            "reorder_threshold": 40,
            "supplier": "BMS Distribution"
        },
        {
            "name": "Lisinopril 10mg",
            "category": CategoryChoices.CHRONIC_CARE,
            "price": Decimal("110.00"),
            "dosage_form": "tablet",
            "manufacturer": "AstraZeneca",
            "strength": "10mg",
            "stock_quantity": 200,
            "reorder_threshold": 30,
            "supplier": "AstraZeneca Kenya"
        },
        {
            "name": "Atorvastatin 20mg",
            "category": CategoryChoices.CHRONIC_CARE,
            "price": Decimal("150.00"),
            "dosage_form": "tablet",
            "manufacturer": "Pfizer",
            "strength": "20mg",
            "stock_quantity": 180,
            "reorder_threshold": 25,
            "supplier": "Pfizer Kenya"
        },
        # Dermatology
        {
            "name": "Hydrocortisone Cream 1%",
            "category": CategoryChoices.DERMATOLOGY,
            "price": Decimal("120.00"),
            "dosage_form": "cream",
            "manufacturer": "Johnson & Johnson",
            "strength": "1%",
            "stock_quantity": 95,
            "reorder_threshold": 15,
            "supplier": "J&J Distribution"
        },
        {
            "name": "Clotrimazole Cream 1%",
            "category": CategoryChoices.DERMATOLOGY,
            "price": Decimal("135.00"),
            "dosage_form": "cream",
            "manufacturer": "Bayer",
            "strength": "1%",
            "stock_quantity": 110,
            "reorder_threshold": 18,
            "supplier": "Bayer HealthCare"
        },
        {
            "name": "Salicylic Acid Solution 2%",
            "category": CategoryChoices.DERMATOLOGY,
            "price": Decimal("100.00"),
            "dosage_form": "solution",
            "manufacturer": "Stiefel",
            "strength": "2%",
            "stock_quantity": 70,
            "reorder_threshold": 12,
            "supplier": "Stiefel Laboratories"
        },
        # Other
        {
            "name": "First Aid Kit Standard",
            "category": CategoryChoices.OTHER,
            "price": Decimal("500.00"),
            "dosage_form": "other",
            "manufacturer": "SafetyFirst",
            "strength": "N/A",
            "stock_quantity": 25,
            "reorder_threshold": 5,
            "supplier": "SafetyFirst Distribution"
        },
        {
            "name": "Digital Thermometer",
            "category": CategoryChoices.OTHER,
            "price": Decimal("350.00"),
            "dosage_form": "other",
            "manufacturer": "Braun",
            "strength": "N/A",
            "stock_quantity": 35,
            "reorder_threshold": 8,
            "supplier": "Braun Kenya"
        },
    ]
    
    created_count = 0
    for product_data in products_data:
        try:
            product, created = Product.objects.get_or_create(
                name=product_data["name"],
                defaults={**product_data, "pharmacy": pharmacy}
            )
            if created:
                created_count += 1
        except Exception as e:
            print(f"✗ Error creating product {product_data['name']}: {e}")
    
    print(f"✓ Created {created_count} new products")
    print(f"✓ Total products: {Product.objects.count()}")

def run():
    """Main seed function."""
    print("\n" + "="*60)
    print("SEEDING PHARMACY DATABASE")
    print("="*60 + "\n")
    
    try:
        pharmacy = seed_pharmacy()
        seed_users(pharmacy)
        seed_products(pharmacy)
        
        print("\n" + "="*60)
        print("✓ SEED COMPLETE")
        print("="*60)
        print(f"Users: {User.objects.count()}")
        print(f"Products: {Product.objects.count()}")
        print(f"Pharmacies: {Pharmacy.objects.count()}")
        print("\nTest Credentials:")
        print("  Admin: admin_user / AdminPass123")
        print("  Pharmacist: pharmacist_jane / PharmPass123")
        print("  Cashier: cashier_bob / CashPass123")
        print("  Customer: customer_alice / CustPass123")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n✗ ERROR: {e}\n")
        raise

# Run the seed function
run()
