#!/usr/bin/env python3
"""
Generate SQL migration script for products and branch stock.
Reads from CSV and generates direct SQL for Supabase.
"""

import csv
import sys
from decimal import Decimal
from datetime import datetime
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
    # Escape single quotes by doubling them
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def generate_product_inserts(products: List[Dict]) -> str:
    """Generate SQL INSERT statements for products."""
    sql_lines = []
    sql_lines.append("-- Insert Products")
    sql_lines.append("INSERT INTO public.products (")
    sql_lines.append("  name, category, price, description, stock_quantity,")
    sql_lines.append("  is_active, pharmacy_id, created_at, updated_at")
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
            
            # Use selling price as the main price, fallback to BP
            price = sp if sp > 0 else bp if bp > 0 else 0.00
            
            if not name or price <= 0:
                continue
            
            # Build description with all prices
            description = f"BP: {bp:.2f}, WP: {wp:.2f}" if bp > 0 or wp > 0 else ""
            
            # Create value tuple
            val = (
                escape_sql_string(name),
                escape_sql_string(dept) if dept else "'OTHER'",
                f"{price:.2f}",
                escape_sql_string(description),
                '0',     # stock_quantity
                'true',  # is_active
                '1',     # pharmacy_id
                'NOW()',
                'NOW()'
            )
            
            values.append(val)
        except Exception as e:
            print(f"✗ Error processing product {idx}: {str(e)[:80]}", file=sys.stderr)
    
    # Build the VALUES clause
    if not values:
        return "-- No products to insert\n"
    
    value_strs = []
    for val in values:
        value_strs.append(f"  ({', '.join(val)})")
    
    sql_lines.append(",\n".join(value_strs))
    sql_lines.append(";")
    
    return "\n".join(sql_lines)


def generate_branch_stock_inserts(products: List[Dict]) -> str:
    """Generate SQL INSERT statements for branch stock."""
    sql_lines = []
    sql_lines.append("\n-- Insert Branch Stock")
    sql_lines.append("-- First, get product IDs")
    sql_lines.append("WITH product_ids AS (")
    sql_lines.append("  SELECT id, name FROM public.products WHERE pharmacy_id = 1")
    sql_lines.append("),")
    
    # Map branch names to IDs (will be fetched dynamically)
    sql_lines.append("branch_ids AS (")
    sql_lines.append("  SELECT id, name FROM public.branches WHERE pharmacy_id = 1")
    sql_lines.append(")")
    sql_lines.append("INSERT INTO public.branch_stock (product_id, branch_id, quantity, last_updated)")
    sql_lines.append("VALUES")
    
    values = []
    for product_data in products:
        try:
            name = product_data.get('Product Name', '').strip()
            if not name:
                continue
            
            transcounty_main = int(float(product_data.get('TRANSCOUNTY_MAIN', 0) or 0))
            transcounty_annex = int(float(product_data.get('TRANSCOUNTY_ANNEX', 0) or 0))
            peakfarm = int(float(product_data.get('PEAKFARM', 0) or 0))
            
            # Create entries for each branch
            for branch_name, quantity in [
                ('TRANSCOUNTY_MAIN', transcounty_main),
                ('TRANSCOUNTY_ANNEX', transcounty_annex),
                ('PEAKFARM', peakfarm)
            ]:
                values.append((
                    escape_sql_string(name),
                    escape_sql_string(branch_name),
                    str(quantity),
                ))
        except Exception as e:
            pass
    
    # Build the VALUES clause
    if not values:
        return "-- No branch stock to insert\n"
    
    # Better approach: use subqueries
    sql_lines = []
    sql_lines.append("\n-- Insert Branch Stock")
    sql_lines.append("WITH product_ids AS (")
    sql_lines.append("  SELECT id, name FROM public.products WHERE pharmacy_id = 1")
    sql_lines.append("),")
    sql_lines.append("branch_ids AS (")
    sql_lines.append("  SELECT id, name FROM public.branches WHERE pharmacy_id = 1")
    sql_lines.append(")")
    sql_lines.append("INSERT INTO public.branch_stock (product_id, branch_id, quantity, last_updated)")
    
    # Group values by branch for cleaner SQL
    stock_data = {}
    for product_data in products:
        try:
            name = product_data.get('Product Name', '').strip()
            if not name:
                continue
            
            transcounty_main = int(float(product_data.get('TRANSCOUNTY_MAIN', 0) or 0))
            transcounty_annex = int(float(product_data.get('TRANSCOUNTY_ANNEX', 0) or 0))
            peakfarm = int(float(product_data.get('PEAKFARM', 0) or 0))
            
            for branch_name, quantity in [
                ('TRANSCOUNTY_MAIN', transcounty_main),
                ('TRANSCOUNTY_ANNEX', transcounty_annex),
                ('PEAKFARM', peakfarm)
            ]:
                if (name, branch_name) not in stock_data:
                    stock_data[(name, branch_name)] = quantity
                else:
                    stock_data[(name, branch_name)] += quantity
        except:
            pass
    
    # Build SELECT statement
    sql_lines.append("SELECT p.id, b.id, SUM(bs.qty) as qty, NOW()")
    sql_lines.append("FROM (VALUES")
    
    value_strs = []
    for (product_name, branch_name), qty in stock_data.items():
        value_strs.append(f"  ({escape_sql_string(product_name)}, {escape_sql_string(branch_name)}, {qty})")
    
    sql_lines.append(",\n".join(value_strs))
    sql_lines.append(") AS bs(product_name, branch_name, qty)")
    sql_lines.append("JOIN product_ids p ON p.name = bs.product_name")
    sql_lines.append("JOIN branch_ids b ON b.name = bs.branch_name")
    sql_lines.append("GROUP BY p.id, b.id, bs.product_name, bs.branch_name")
    sql_lines.append("ON CONFLICT(product_id, branch_id) DO UPDATE SET")
    sql_lines.append("  quantity = EXCLUDED.quantity,")
    sql_lines.append("  last_updated = NOW();")
    
    return "\n".join(sql_lines)


def main():
    csv_file = '/home/steve/pharmacy-aggregator/product_branch_inventory.csv'
    output_file = '/home/steve/pharmacy-aggregator/supabase/migrations/20260605_override_products.sql'
    
    # Read products
    products = read_product_csv(csv_file)
    if not products:
        print("✗ No products to migrate", file=sys.stderr)
        sys.exit(1)
    
    print(f"✓ Processing {len(products)} products", file=sys.stderr)
    
    # Generate SQL
    sql_content = """-- Generated Product Migration Script for Supabase
-- This migration OVERRIDES existing products and prices
-- Date: {}
-- Total Products: {}
-- Action: DELETE old products and INSERT all 3,744 new products

BEGIN TRANSACTION;

-- Step 1: Ensure pharmacy exists (check if already exists first)
INSERT INTO public.pharmacies (name, address, contact_phone, license_number, is_active, created_at, updated_at)
SELECT 'Transcounty', 'Kitale, Kenya', '+254720246981', 'PHARMACY-MAIN-001', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pharmacies WHERE name = 'Transcounty');

-- Step 2: Ensure branches exist
INSERT INTO public.branches (pharmacy_id, name, branch_type, address, contact_phone, license_number, is_active, is_headquarters, created_at, updated_at)
VALUES
  (1, 'TRANSCOUNTY_MAIN', 'CHEMIST', 'Kitale, Laini Moja', '+254720246981', 'BRANCH-MAIN-001', true, true, NOW(), NOW()),
  (1, 'TRANSCOUNTY_ANNEX', 'CHEMIST', 'Kitale, Bamila Building', '+254720246981', 'BRANCH-ANNEX-001', true, false, NOW(), NOW()),
  (1, 'PEAKFARM', 'AGROVET', 'Peakfarm, Kitale', '+254720246981', 'BRANCH-PEAK-001', true, false, NOW(), NOW())
ON CONFLICT(name) DO NOTHING;

-- Step 3: DELETE existing products and branch_stock for this pharmacy (OVERRIDE)
DELETE FROM public.branch_stock 
WHERE product_id IN (
  SELECT id FROM public.products 
  WHERE pharmacy_id = 1
);

DELETE FROM public.products 
WHERE pharmacy_id = 1;

-- Step 4: Insert/Update Products
{}

-- Step 5: Insert/Update Branch Stock
{}

-- Commit transaction
COMMIT;

-- Migration complete - {} products inserted, {} branch stock entries created
""".format(
        datetime.now().isoformat(),
        len(products),
        generate_product_inserts(products),
        generate_branch_stock_inserts(products),
        len(products),
        len(products) * 3  # 3 branches per product
    )
    
    # Write to file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        print(f"✓ Generated SQL migration: {output_file}", file=sys.stderr)
        print(f"✓ File size: {len(sql_content)} bytes", file=sys.stderr)
        print("\n✓ Migration script generated successfully!", file=sys.stderr)
    except Exception as e:
        print(f"✗ Failed to write migration file: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
