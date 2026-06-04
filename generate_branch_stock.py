#!/usr/bin/env python3
"""
Generate branch_stock migration SQL for Supabase.
Maps product stock to branches based on product_branch_inventory.csv
"""

import csv
import os
from pathlib import Path

def escape_sql_string(s):
    """Escape SQL string literals"""
    if s is None:
        return "NULL"
    s = str(s).replace("'", "''")
    return f"'{s}'"

def read_product_csv():
    """Read product branch inventory CSV and return list of products with quantities"""
    csv_path = "/home/steve/pharmacy-aggregator/product_branch_inventory.csv"
    
    products = []
    if os.path.exists(csv_path):
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                products.append({
                    'name': row['Product Name'],
                    'code': row.get('Code', ''),
                    'department': row['Department'],
                    'transcounty_main': int(float(row.get('TRANSCOUNTY_MAIN', 0))),
                    'transcounty_annex': int(float(row.get('TRANSCOUNTY_ANNEX', 0))),
                    'peakfarm': int(float(row.get('PEAKFARM', 0)))
                })
    return products

def generate_branch_stock():
    """Generate branch_stock INSERT statements"""
    products = read_product_csv()
    
    if not products:
        print("✗ No products found in CSV")
        return ""
    
    print(f"✓ Read {len(products)} products from CSV")
    
    sql_lines = []
    sql_lines.append("-- Step 4: Populate branch_stock from product_branch_inventory.csv")
    sql_lines.append("-- Insert stock quantities for each product at each branch")
    sql_lines.append("")
    sql_lines.append("-- Branch IDs: TRANSCOUNTY_MAIN=1, TRANSCOUNTY_ANNEX=2, PEAKFARM=3")
    sql_lines.append("INSERT INTO public.branch_stock (product_id, branch_id, quantity, reorder_level, last_updated)")
    sql_lines.append("SELECT")
    sql_lines.append("  p.id as product_id,")
    sql_lines.append("  b.id as branch_id,")
    sql_lines.append("  CASE")
    sql_lines.append("    WHEN b.name = 'TRANSCOUNTY_MAIN' THEN stock_main")
    sql_lines.append("    WHEN b.name = 'TRANSCOUNTY_ANNEX' THEN stock_annex")
    sql_lines.append("    WHEN b.name = 'PEAKFARM' THEN stock_peakfarm")
    sql_lines.append("    ELSE 0")
    sql_lines.append("  END as quantity,")
    sql_lines.append("  10 as reorder_level,")
    sql_lines.append("  NOW() as last_updated")
    sql_lines.append("FROM (")
    sql_lines.append("  VALUES")
    
    # Create VALUES clause for all products with their stock quantities
    value_rows = []
    for product in products:
        value_row = (
            f"({escape_sql_string(product['name'])}, "
            f"{product['transcounty_main']}, "
            f"{product['transcounty_annex']}, "
            f"{product['peakfarm']})"
        )
        value_rows.append(value_row)
    
    sql_lines.append(",\n  ".join(value_rows))
    
    sql_lines.append(") AS product_stock(product_name, stock_main, stock_annex, stock_peakfarm)")
    sql_lines.append("CROSS JOIN public.branches b")
    sql_lines.append("INNER JOIN public.products p ON p.name = product_stock.product_name AND p.pharmacy_id = 1")
    sql_lines.append("WHERE b.pharmacy_id = 1")
    sql_lines.append("ON CONFLICT(product_id, branch_id) DO UPDATE")
    sql_lines.append("SET quantity = EXCLUDED.quantity, last_updated = NOW();")
    
    return "\n".join(sql_lines)

def main():
    output_path = "/home/steve/pharmacy-aggregator/supabase/migrations/20260604_branch_stock.sql"
    
    sql_content = generate_branch_stock()
    
    if not sql_content:
        print("✗ Failed to generate SQL")
        return
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    
    file_size = os.path.getsize(output_path)
    print(f"✓ Generated: {output_path}")
    print(f"✓ File size: {file_size} bytes")

if __name__ == '__main__':
    main()
