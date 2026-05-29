import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User, Branch
from products.models import Product, Category
from inventory.models import Supplier, StockIntake, Dispensation

print("=== NEW SYSTEM (Django) COUNTS ===")
print(f"Users: {User.objects.count()}")
print(f"Branches: {Branch.objects.count()}")
print(f"Products: {Product.objects.count()}")
print(f"Categories: {Category.objects.count()}")
print(f"Suppliers: {Supplier.objects.count()}")
print(f"StockIntakes (Purchases/Inwards): {StockIntake.objects.count()}")
print(f"Dispensations (Sales): {Dispensation.objects.count()}")
