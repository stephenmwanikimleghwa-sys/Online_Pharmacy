import os
import re
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from users.models import User, RoleChoices

class Command(BaseCommand):
    help = 'Imports legacy customers from database/transcount.sql'

    def handle(self, *args, **options):
        from django.conf import settings
        sql_path = os.path.join(
            settings.BASE_DIR.parent,
            'database',
            'transcount.sql'
        )

        if not os.path.exists(sql_path):
            self.stdout.write(self.style.ERROR(f"File not found: {sql_path}"))
            return

        self.stdout.write(f"Reading {sql_path}...")

        with open(sql_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()

        # Find the block for `customers`
        # Looks like: INSERT INTO `customers` VALUES ('Transcounty','PHARMWEB','N/A','KITALE','0720003788',NULL,6),...
        
        insert_statements = re.findall(r"INSERT INTO `customers` VALUES \((.*?)\);", content, re.IGNORECASE | re.DOTALL)
        
        if not insert_statements:
            self.stdout.write(self.style.WARNING("No INSERT INTO `customers` found."))
            return

        total_imported = 0
        total_skipped = 0

        with transaction.atomic():
            for statement in insert_statements:
                # Naive split by '),(' to get individual records
                records_raw = statement.split("),(")
                for record_raw in records_raw:
                    # Clean up leading/trailing parens
                    record_raw = record_raw.strip("()")
                    
                    # Split by comma but respect quotes
                    # A better way is using a CSV reader or regex
                    # The format is 'company','customerid','address','location','phone','balance',id
                    # We can use regex to split by comma outside quotes
                    parts = []
                    current_part = []
                    in_quotes = False
                    
                    for char in record_raw:
                        if char == "'":
                            in_quotes = not in_quotes
                        elif char == "," and not in_quotes:
                            parts.append("".join(current_part))
                            current_part = []
                            continue
                        current_part.append(char)
                    parts.append("".join(current_part))

                    # Clean quotes and NULL
                    parts = [p.strip().strip("'") if p.strip() != 'NULL' else None for p in parts]

                    if len(parts) < 7:
                        self.stdout.write(self.style.WARNING(f"Skipping malformed record: {record_raw}"))
                        total_skipped += 1
                        continue

                    company = parts[0]
                    customer_id = parts[1] # This is the Name
                    address = parts[2]
                    location = parts[3]
                    phone = parts[4]
                    balance_str = parts[5]
                    old_id = parts[6]

                    if not customer_id:
                        total_skipped += 1
                        continue

                    # Generate username
                    base_username = slugify(customer_id)
                    if not base_username:
                        base_username = f"customer_{old_id}"
                        
                    username = base_username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}_{counter}"
                        counter += 1

                    # Parse balance
                    try:
                        balance = Decimal(balance_str) if balance_str else Decimal('0.00')
                    except Exception:
                        balance = Decimal('0.00')

                    try:
                        User.objects.create(
                            username=username,
                            first_name=customer_id[:150], # Trim to max_length
                            role=RoleChoices.CUSTOMER,
                            phone_number=phone[:15] if phone else "",
                            address=f"{address or ''} {location or ''}".strip(),
                            credit_balance=balance,
                            is_credit_customer=True,
                            is_active=True
                        )
                        total_imported += 1
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error importing {customer_id}: {e}"))
                        total_skipped += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully imported {total_imported} customers. Skipped {total_skipped}."))
