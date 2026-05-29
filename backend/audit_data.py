import os
import sys
import django
import re
from collections import defaultdict

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User, Branch, Pharmacy
from products.models import Product, Category
from inventory.models import Supplier, StockIntake, Dispensation

def analyze_old_db(filepath):
    table_counts = defaultdict(int)
    current_table = None
    
    with open(filepath, 'r', encoding='latin1') as f:
        for line in f:
            if line.startswith('INSERT INTO'):
                # Extract table name: INSERT INTO `tablename`
                match = re.search(r'INSERT INTO `?([a-zA-Z0-9_]+)`?', line)
                if match:
                    table = match.group(1)
                    # Count the number of value tuples: VALUES (...), (...);
                    # This is a bit tricky with regex, let's just count the occurrences of "),(" or "), (" plus 1
                    # A better way is to count occurrences of `),` if they are not inside strings.
                    # As a rough estimate, just counting `),` or just treating it as 1 line if it's one row per insert.
                    # MySQL dumps often do batch inserts.
                    # Let's count `),` plus 1, assuming it's roughly the number of rows
                    # if we just want exact count we can split by '),(' 
                    # but maybe just let's see how many `),(` there are.
                    values_part = line.split('VALUES', 1)[-1]
                    count = values_part.count('),(') + values_part.count('), (') + 1
                    table_counts[table] += count

    return dict(table_counts)

def analyze_new_db():
    return {
        'users': User.objects.count(),
        'branches': Branch.objects.count(),
        'products': Product.objects.count(),
        'categories': Category.objects.count(),
        'suppliers': Supplier.objects.count(),
        'stock_intakes': StockIntake.objects.count(),
        'sales (dispensations)': Dispensation.objects.count(),
    }

if __name__ == '__main__':
    old_counts = analyze_old_db('/home/steve/pharmacy-aggregator/database/transcount.sql')
    new_counts = analyze_new_db()
    
    print("--- OLD SYSTEM (MySQL Dump) ---")
    for t, c in sorted(old_counts.items()):
        print(f"{t}: {c}")
        
    print("\n--- NEW SYSTEM (Django DB) ---")
    for t, c in new_counts.items():
        print(f"{t}: {c}")

