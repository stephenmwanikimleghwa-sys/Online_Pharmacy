import csv
search_terms = ["vitaglobin", "ranferon", "darling", "micromox", "dentamol", "susten"]

with open('/home/steve/pharmacy-aggregator/product_branch_inventory.csv', 'r') as f:
    reader = csv.reader(f)
    for row in reader:
        name = row[0].lower()
        for term in search_terms:
            if term in name:
                print(f"Found {term} in CSV: {row[0]} -> {row}")
