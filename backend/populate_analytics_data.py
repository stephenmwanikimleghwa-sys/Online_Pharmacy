import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User, Pharmacy
from products.models import Product, StockLog

def populate_data():
    print("Populating analytics data...")

    # Ensure we have a user and pharmacy
    user = User.objects.filter(role='admin').first()
    if not user:
        print("No admin user found. Please create one first.")
        return

    pharmacy = user.pharmacy
    if not pharmacy:
        print("User has no pharmacy assigned. Creating default...")
        pharmacy = Pharmacy.objects.create(
            name="Default Pharmacy",
            license_number=f"LIC-{random.randint(1000, 9999)}"
        )
        user.pharmacy = pharmacy
        user.save()

    # Create Products
    products_data = [
        {"name": "Paracetamol 500mg", "price": 10.0, "stock": 500, "threshold": 100},
        {"name": "Amoxicillin 250mg", "price": 150.0, "stock": 50, "threshold": 20}, # Low stock
        {"name": "Ibuprofen 400mg", "price": 20.0, "stock": 200, "threshold": 50},
        {"name": "Cetirizine 10mg", "price": 30.0, "stock": 5, "threshold": 10}, # Very low stock
        {"name": "Vitamin C 1000mg", "price": 15.0, "stock": 300, "threshold": 50},
    ]

    created_products = []
    for p_data in products_data:
        # Handle potential duplicates
        products = Product.objects.filter(name=p_data["name"], pharmacy=pharmacy)
        if products.exists():
            product = products.first()
            # Update existing
            product.stock_quantity = p_data["stock"]
            product.reorder_threshold = p_data["threshold"]
            product.price = p_data["price"]
            product.save()
            print(f"Updated existing product: {product.name}")
        else:
            product = Product.objects.create(
                name=p_data["name"],
                pharmacy=pharmacy,
                description=f"Sample description for {p_data['name']}",
                price=p_data["price"],
                stock_quantity=p_data["stock"],
                reorder_threshold=p_data["threshold"],
                category="Medicine",
                is_active=True
            )
            print(f"Created new product: {product.name}")
            
        created_products.append(product)

    # Generate Sales Logs (for Top Selling Chart)
    print("\nGenerating sales logs...")
    end_date = timezone.now()
    start_date = end_date - timedelta(days=30)

    for product in created_products:
        # Random number of sales
        num_sales = random.randint(5, 20)
        for _ in range(num_sales):
            sale_qty = random.randint(1, 5)
            sale_date = start_date + timedelta(days=random.randint(0, 30))
            
            StockLog.objects.create(
                product=product,
                previous_quantity=product.stock_quantity + sale_qty, # Approximation
                new_quantity=product.stock_quantity,
                change_amount=-sale_qty, # Negative for sales
                change_type='sale',
                reason='Customer Sale',
                logged_by=user,
                timestamp=sale_date
            )
    
    print("Done! Analytics data populated.")
    print(f"Total StockLogs: {StockLog.objects.count()}")
    print(f"Total Sales Logs: {StockLog.objects.filter(change_type='sale').count()}")

if __name__ == '__main__':
    populate_data()
