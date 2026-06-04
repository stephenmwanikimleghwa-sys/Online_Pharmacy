#!/usr/bin/env python3
"""
Product migration script for Supabase.
Reads product data from CSV files and migrates to Supabase database.
Handles upserts to avoid duplicates.
"""

import csv
import json
import os
import sys
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Tuple

# Add Django to path
sys.path.insert(0, '/home/steve/pharmacy-aggregator/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

try:
    import django
    django.setup()
    from django.db import connection
    from users.models import Pharmacy, Branch, BranchTypeChoices
    from products.models import Product, BranchStock
    print("✓ Django setup complete")
except Exception as e:
    print(f"✗ Django setup failed: {e}")
    sys.exit(1)


def read_product_csv(filepath: str) -> List[Dict]:
    """Read product data from CSV file."""
    products = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                products.append(row)
        print(f"✓ Read {len(products)} products from {filepath}")
        return products
    except Exception as e:
        print(f"✗ Failed to read CSV: {e}")
        return []


def get_or_create_pharmacy():
    """Get or create default pharmacy."""
    pharmacy, created = Pharmacy.objects.get_or_create(
        name='Transcounty',
        defaults={
            'contact_phone': '+254720246981',
            'address': 'Kitale, Kenya',
            'license_number': 'LIC-TRANSCOUNTY-001'
        }
    )
    if created:
        print(f"✓ Created default pharmacy: {pharmacy.name}")
    else:
        print(f"✓ Using existing pharmacy: {pharmacy.name}")
    return pharmacy


def get_or_create_branches(pharmacy):
    """Get or create branches based on inventory data."""
    branches_info = {
        'TRANSCOUNTY_MAIN': {
            'branch_type': BranchTypeChoices.CHEMIST,
            'address': 'Kitale, Laini Moja',
            'contact_phone': '+254720246981',
            'is_headquarters': True
        },
        'TRANSCOUNTY_ANNEX': {
            'branch_type': BranchTypeChoices.CHEMIST,
            'address': 'Kitale, Bamila Building',
            'contact_phone': '+254720246981',
            'is_headquarters': False
        },
        'PEAKFARM': {
            'branch_type': BranchTypeChoices.AGROVET,
            'address': 'Peakfarm, Kitale',
            'contact_phone': '+254720246981',
            'is_headquarters': False
        }
    }
    
    branches = {}
    for branch_name, info in branches_info.items():
        branch, created = Branch.objects.get_or_create(
            pharmacy=pharmacy,
            name=branch_name,
            defaults=info
        )
        branches[branch_name] = branch
        status = "Created" if created else "Using existing"
        print(f"✓ {status} branch: {branch_name}")
    
    return branches


def migrate_products(csv_filepath: str, pharmacy, branches):
    """
    Migrate products from CSV to database.
    Handles upserts to avoid duplicates.
    """
    products_data = read_product_csv(csv_filepath)
    
    if not products_data:
        print("✗ No products to migrate")
        return
    
    created_count = 0
    updated_count = 0
    skipped_count = 0
    branch_stock_created = 0
    
    print(f"\nMigrating {len(products_data)} products...")
    print("-" * 80)
    
    for idx, product_data in enumerate(products_data, 1):
        try:
            # Extract product information
            name = product_data.get('Product Name', '').strip()
            code = product_data.get('Code', '').strip()
            dept = product_data.get('Department', '').strip()
            
            # Convert prices
            bp = float(product_data.get('BP (Buying Price)', 0) or 0)
            sp = float(product_data.get('SP (Selling Price)', 0) or 0)
            wp = float(product_data.get('WP (Wholesale Price)', 0) or 0)
            
            # Use selling price as the main price, fallback to BP
            price = Decimal(str(sp)) if sp > 0 else Decimal(str(bp)) if bp > 0 else Decimal('0.00')
            
            if not name or price <= 0:
                skipped_count += 1
                if idx % 500 == 0:
                    print(f"  [{idx}] Skipped (incomplete data)")
                continue
            
            # Create or update product
            product, created = Product.objects.update_or_create(
                name=name,
                defaults={
                    'code': code if code else None,
                    'category': dept if dept else 'other',
                    'price': price,
                    'description': f"BP: {bp}, WP: {wp}" if bp > 0 else "",
                    'is_active': True,
                    'pharmacy': pharmacy,
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
            
            # Create branch stock entries
            transcounty_main = int(float(product_data.get('TRANSCOUNTY_MAIN', 0) or 0))
            transcounty_annex = int(float(product_data.get('TRANSCOUNTY_ANNEX', 0) or 0))
            peakfarm = int(float(product_data.get('PEAKFARM', 0) or 0))
            
            # Create/update BranchStock records
            for branch_name, quantity in [
                ('TRANSCOUNTY_MAIN', transcounty_main),
                ('TRANSCOUNTY_ANNEX', transcounty_annex),
                ('PEAKFARM', peakfarm)
            ]:
                if branch_name in branches:
                    branch = branches[branch_name]
                    bs, bs_created = BranchStock.objects.update_or_create(
                        product=product,
                        branch=branch,
                        defaults={'quantity': Decimal(str(quantity))}
                    )
                    if bs_created:
                        branch_stock_created += 1
            
            if idx % 500 == 0:
                print(f"  [{idx}] {created_count} created, {updated_count} updated, {skipped_count} skipped")
        
        except Exception as e:
            print(f"  ✗ Error migrating product {idx}: {str(e)[:80]}")
            skipped_count += 1
    
    print("-" * 80)
    print(f"\n✓ Migration Complete!")
    print(f"  Created products: {created_count}")
    print(f"  Updated products: {updated_count}")
    print(f"  Skipped products: {skipped_count}")
    print(f"  Branch stock entries: {branch_stock_created}")
    print(f"  Total processed: {created_count + updated_count + skipped_count}")


def verify_migration():
    """Verify the migration was successful."""
    print("\n" + "=" * 80)
    print("MIGRATION VERIFICATION")
    print("=" * 80)
    
    total_products = Product.objects.count()
    total_branch_stock = BranchStock.objects.count()
    
    print(f"\n✓ Total products in database: {total_products}")
    print(f"✓ Total branch stock entries: {total_branch_stock}")
    
    # Products by department
    print("\nProducts by Department:")
    chemist_count = Product.objects.filter(category__icontains='CHEMIST').count()
    agrovet_count = Product.objects.filter(category__icontains='AGROVET').count()
    other_count = Product.objects.exclude(category__icontains='CHEMIST').exclude(category__icontains='AGROVET').count()
    
    print(f"  CHEMIST: {chemist_count}")
    print(f"  AGROVET: {agrovet_count}")
    print(f"  Other/Unknown: {other_count}")
    
    # Stock by branch
    print("\nStock by Branch:")
    for branch in Branch.objects.all():
        total_qty = BranchStock.objects.filter(branch=branch).aggregate(
            total=models.Sum('quantity')
        )['total'] or 0
        products_count = BranchStock.objects.filter(branch=branch).count()
        print(f"  {branch.name}: {products_count} products, {total_qty:.0f} units")


if __name__ == '__main__':
    from django.db import models
    
    print("=" * 80)
    print("PRODUCT MIGRATION TO SUPABASE")
    print("=" * 80)
    
    # Get or create pharmacy and branches
    pharmacy = get_or_create_pharmacy()
    branches = get_or_create_branches(pharmacy)
    
    # Migrate products
    csv_file = '/home/steve/pharmacy-aggregator/product_branch_inventory.csv'
    if os.path.exists(csv_file):
        migrate_products(csv_file, pharmacy, branches)
    else:
        print(f"✗ CSV file not found: {csv_file}")
        sys.exit(1)
    
    # Verify migration
    verify_migration()
    
    print("\n✓ Migration script completed successfully!")
