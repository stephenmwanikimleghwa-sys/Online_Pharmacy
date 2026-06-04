#!/usr/bin/env python
"""
Generate Supabase migration for department column.
Adds department column and populates it from CSV data.
"""
import csv
from pathlib import Path

def generate_department_migration():
    """Generate SQL migration to add department column and populate data."""
    
    csv_file = Path('product_branch_inventory.csv')
    if not csv_file.exists():
        print(f"❌ CSV file not found: {csv_file}")
        return False
    
    # Read department data from CSV
    department_updates = {}
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            product_name = row['Product Name'].strip()
            department = row['Department'].strip()
            if product_name:
                department_updates[product_name] = department
                count += 1
    
    print(f"✓ Read {count} products from CSV")
    
    # Generate migration SQL
    migration_content = """-- Add department column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS department VARCHAR(50) DEFAULT 'OTHER';

-- Create index on department column for filtering
CREATE INDEX IF NOT EXISTS idx_products_department ON public.products(department);

-- Update department values based on product names
-- Using CASE statements for bulk updates
UPDATE public.products SET department = (
  CASE
"""
    
    # Add all the product name -> department mappings
    for product_name, department in sorted(department_updates.items()):
        # Escape single quotes in product names
        escaped_name = product_name.replace("'", "''")
        migration_content += f"    WHEN name = '{escaped_name}' THEN '{department}'\n"
    
    migration_content += """    ELSE 'OTHER'
  END
) WHERE department = 'OTHER' OR department IS NULL;

-- Verify update count
SELECT COUNT(*) as department_updated FROM public.products WHERE department != 'OTHER';
"""
    
    # Write migration file
    migration_dir = Path('supabase/migrations')
    migration_dir.mkdir(parents=True, exist_ok=True)
    
    # Find next migration number
    existing_migrations = sorted(migration_dir.glob('*.sql'))
    if existing_migrations:
        last_migration = existing_migrations[-1].stem
        try:
            last_num = int(last_migration.split('_')[0])
            next_num = last_num + 1
        except (ValueError, IndexError):
            next_num = 20260605
    else:
        next_num = 20260605
    
    migration_file = migration_dir / f'{next_num:08d}_add_department.sql'
    
    with open(migration_file, 'w', encoding='utf-8') as f:
        f.write(migration_content)
    
    file_size = migration_file.stat().st_size
    print(f"✓ Generated: {migration_file}")
    print(f"✓ File size: {file_size} bytes")
    print(f"✓ Updated {len(department_updates)} products with department data")
    
    return True

if __name__ == '__main__':
    success = generate_department_migration()
    exit(0 if success else 1)
