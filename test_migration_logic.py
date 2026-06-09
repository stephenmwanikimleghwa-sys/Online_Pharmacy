import csv
import json

_CSV_FILE = "product_branch_inventory.csv"

# Mock the product from DB
mock_db_product = {
    "name": "AGROVET TEST PRODUCT",
    "category": None,
    "department": "AGROVET",
    "price": "1500.00"
}

products_by_name = {
    mock_db_product["name"].strip().lower(): mock_db_product
}

with open(_CSV_FILE, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    headers = next(reader)
    for row in reader:
        if len(row) < 6:
            continue
        prod_name = row[0].strip()
        
        product = products_by_name.get(prod_name.lower())
        if product:
            print(f"FOUND IN CSV: {prod_name}")
            print(f"CSV Row data: Code={row[1]}, Dept={row[2]}, BP={row[3]}, SP={row[4]}, WP={row[5]}")
            break
