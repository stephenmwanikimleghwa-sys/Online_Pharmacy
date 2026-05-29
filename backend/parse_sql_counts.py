import re
from collections import defaultdict

filepath = '/home/steve/pharmacy-aggregator/database/transcount.sql'
table_counts = defaultdict(int)

with open(filepath, 'r', encoding='latin1') as f:
    for line in f:
        if line.startswith('INSERT INTO'):
            match = re.search(r'INSERT INTO `?([a-zA-Z0-9_]+)`?', line)
            if match:
                table = match.group(1)
                # Count values tuples
                values_part = line.split('VALUES', 1)[-1]
                # occurrences of '),' not strictly inside quotes is hard, but just counting '),' is usually close enough for a quick audit.
                # Actually, counting occurrences of '),(' or '), ('
                count = values_part.count('),(') + values_part.count('), (') + 1
                table_counts[table] += count

print("=== OLD SYSTEM (MySQL) COUNTS ===")
for t, c in sorted(table_counts.items(), key=lambda x: -x[1]):
    print(f"{t}: {c}")

