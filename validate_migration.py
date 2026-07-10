#!/usr/bin/env python3
"""
Validate migration completion by checking Supabase product count
"""

import subprocess
import json
import os

# IMPORTANT: Never hardcode database credentials in source files.
# Set DATABASE_URL in your shell before running this script.
# Example: DATABASE_URL=postgresql://... python validate_migration.py
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    raise EnvironmentError(
        "DATABASE_URL environment variable is required.\n"
        "Run: DATABASE_URL=<your-url> python validate_migration.py"
    )

# Query to count products
query = """
SELECT 
  COUNT(*) as total_products,
  COUNT(DISTINCT category) as unique_categories,
  SUM(CASE WHEN category LIKE '%CHEMIST%' THEN 1 ELSE 0 END) as chemist_count,
  SUM(CASE WHEN category LIKE '%AGROVET%' THEN 1 ELSE 0 END) as agrovet_count
FROM public.products 
WHERE pharmacy_id = 1;
"""

print("Checking Supabase database for products...")
print(f"Database: {DB_URL[:50]}...")
print()

try:
    result = subprocess.run(
        ['psql', DB_URL, '-c', query],
        capture_output=True,
        text=True,
        timeout=30
    )
    
    if result.returncode == 0:
        print("✓ Database query successful!")
        print()
        print(result.stdout)
    else:
        print("✗ Query failed:")
        print(result.stderr)
except subprocess.TimeoutExpired:
    print("✗ Query timed out")
except Exception as e:
    print(f"✗ Error: {e}")
