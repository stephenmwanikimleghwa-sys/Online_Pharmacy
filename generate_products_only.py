#!/usr/bin/env python3
"""
Generate a simple products-only migration (step 2)
"""

import csv
import sys
from typing import List, Dict

def read_product_csv(filepath: str) -> List[Dict]:
    """Read product data from CSV file."""
    products = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                products.append(row)
        print(f"✓ Read {len(products)} products from CSV", file=sys.stderr)
        return products
    except Exception as e:
        print(f"✗ Failed to read CSV: {e}", file=sys.stderr)
        return []

def escape_sql_string(value: str) -> str:
    """Escape SQL string value."""
    if not value or value == 'NULL':
        return 'NULL'
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"

def generate_products_only(products: List[Dict]) -> str:
    """Generate minimal products-only SQL."""
    sql_lines = []
    sql_lines.append("-- Step 2: Insert Products Only")
    sql_lines.append("INSERT INTO public.products (")
    sql_lines.append("  name, category, price, description, stock_quantity, reorder_threshold, is_active, is_featured, dosage_form, pharmacy_id, created_at, updated_at")
    sql_lines.append(") VALUES")
    
    values = []
    for idx, product_data in enumerate(products):
        try:
            name = product_data.get('Product Name', '').strip()
            dept = product_data.get('Department', '').strip()
            
            # Convert prices
            bp = float(product_data.get('BP', 0) or 0)
            sp = float(product_data.get('SP', 0) or 0)
            wp = float(product_data.get('WP', 0) or 0)
            
            price = sp if sp > 0 else bp if bp > 0 else 0.00
            
            if not name or price <= 0:
                continue
            
            description = f"BP: {bp:.2f}, WP: {wp:.2f}" if bp > 0 or wp > 0 else ""
            
            val = (
                escape_sql_string(name),
                escape_sql_string(dept) if dept else "'OTHER'",
                f"{price:.2f}",
                escape_sql_string(description),
                '0',     # stock_quantity
                '10',    # reorder_threshold
                'true',  # is_active
                'false', # is_featured
                "'other'", # dosage_form
                '1',     # pharmacy_id
                'NOW()',
                'NOW()'
            )
            
            values.append(val)
        except Exception as e:
            pass
    
    if not values:
        return "-- No products to insert\n"
    
    value_strs = []
    for val in values:
        value_strs.append(f"({', '.join(val)})")
    
    sql_lines.append(",\n".join(value_strs))
    sql_lines.append(";")
    
    return "\n".join(sql_lines)

def main():
    csv_file = '/home/steve/pharmacy-aggregator/product_branch_inventory.csv'
    output_file = '/home/steve/pharmacy-aggregator/supabase/migrations/20260602_products.sql'
    
    products = read_product_csv(csv_file)
    if not products:
        print("✗ No products to migrate", file=sys.stderr)
        sys.exit(1)
    
    print(f"✓ Processing {len(products)} products", file=sys.stderr)
    
    sql_content = generate_products_only(products)
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        print(f"✓ Generated: {output_file}", file=sys.stderr)
        print(f"✓ File size: {len(sql_content)} bytes", file=sys.stderr)
    except Exception as e:
        print(f"✗ Failed to write file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
