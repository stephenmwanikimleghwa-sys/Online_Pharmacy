# Generated manually
from django.db import migrations
import csv
import os
from decimal import Decimal
from pathlib import Path

# Resolve the CSV file path relative to the Django project root inside Docker
# __file__ is backend/products/migrations/0019_...py
# .parent.parent.parent is /app (inside docker) or backend (locally)
_MIGRATIONS_DIR = Path(__file__).resolve().parent.parent.parent
_CSV_FILE = _MIGRATIONS_DIR / "csv_imports" / "product_branch_inventory.csv"

def retry_import_legacy_prices_and_categories(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    PricingTier = apps.get_model('products', 'PricingTier')
    
    if not os.path.exists(_CSV_FILE):
        print(f"ERROR: CSV file not found at {_CSV_FILE}")
        return

    # Dictionary to quickly look up product by name (case-insensitive)
    products_by_name = {}
    for p in Product.objects.all():
        products_by_name[p.name.strip().lower()] = p

    products_to_update = []
    pricing_tiers_to_create_or_update = {}
    
    with open(_CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        try:
            headers = next(reader)
        except StopIteration:
            return
            
        for row in reader:
            if len(row) < 6:
                continue
            
            prod_name = row[0].strip()
            code = row[1].strip() # Category
            department = row[2].strip() # Department
            
            try:
                bp = Decimal(row[3].strip() or '0')
                sp = Decimal(row[4].strip() or '0')
                wp = Decimal(row[5].strip() or '0')
            except ValueError:
                continue
            
            product = products_by_name.get(prod_name.lower())
            if not product:
                continue
                
            updated_product = False
            
            # Update Category using Code from CSV
            if product.category != code:
                product.category = code
                updated_product = True
                
            # Update Department using Department from CSV
            if product.department != department:
                product.department = department
                updated_product = True
                
            # Update price to SP
            if product.price != sp:
                product.price = sp
                updated_product = True
                
            if updated_product:
                products_to_update.append(product)
                
            # Queue Pricing Tier for update/creation
            pricing_tiers_to_create_or_update[product.id] = {
                'product': product,
                'buying_price': bp,
                'retail_price': sp,
                'wholesale_price': wp,
            }

    # Bulk update products
    if products_to_update:
        Product.objects.bulk_update(products_to_update, ['category', 'department', 'price'])
        
    # Process Pricing Tiers
    existing_tiers = {pt.product_id: pt for pt in PricingTier.objects.filter(product_id__in=pricing_tiers_to_create_or_update.keys())}
    
    tiers_to_create = []
    tiers_to_update = []
    
    for product_id, data in pricing_tiers_to_create_or_update.items():
        if product_id in existing_tiers:
            pt = existing_tiers[product_id]
            pt.buying_price = data['buying_price']
            pt.retail_price = data['retail_price']
            pt.wholesale_price = data['wholesale_price']
            pt.use_legacy_prices = True  # Prevent formula overwriting these prices
            pt.is_active = True
            tiers_to_update.append(pt)
        else:
            tiers_to_create.append(
                PricingTier(
                    product=data['product'],
                    buying_price=data['buying_price'],
                    retail_price=data['retail_price'],
                    wholesale_price=data['wholesale_price'],
                    use_legacy_prices=True,
                    is_active=True
                )
            )
            
    if tiers_to_update:
        PricingTier.objects.bulk_update(tiers_to_update, ['buying_price', 'retail_price', 'wholesale_price', 'use_legacy_prices', 'is_active'])
        
    if tiers_to_create:
        PricingTier.objects.bulk_create(tiers_to_create, ignore_conflicts=True)

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0018_import_legacy_prices_and_categories'),
    ]

    operations = [
        migrations.RunPython(retry_import_legacy_prices_and_categories, reverse_code=migrations.RunPython.noop),
    ]
