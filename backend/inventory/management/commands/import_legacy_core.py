"""
Management command: import_legacy_core
Imports core data from the legacy transcount.sql MySQL dump into the new system.

Phase 1 — Core Data:
  1. Branches  (3 records)
  2. Staff Users  (4 records — Judy, Julius, Kimutai, Ochieng)
  3. Customers  (~25 records)
  4. Suppliers  (22 records)
  5. Products + PricingTiers  (~3,749 records from `unitsofmeasure`)

Rules:
  - float → DECIMAL(15,2)
  - Plain-text passwords → bcrypt placeholder
  - NEVER overwrite data that already exists
  - NEVER drop or modify existing new-system tables/columns
"""

import re
import os
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.utils import timezone

from users.models import Pharmacy, Branch, User
from products.models import Product, PricingTier
from inventory.models import Supplier


# ──────────────────────────── SQL PARSER HELPERS ────────────────────────────

def parse_inserts(filepath, table_name):
    """
    Parse INSERT INTO `table_name` VALUES (...),(...); lines from a MySQL dump.
    Returns a list of tuples (as strings) for each row.
    """
    rows = []
    pattern = re.compile(
        rf"INSERT\s+INTO\s+`?{re.escape(table_name)}`?\s+VALUES\s*",
        re.IGNORECASE,
    )

    with open(filepath, "r", encoding="latin1") as f:
        for line in f:
            if not pattern.match(line):
                continue
            # Extract everything after VALUES
            _, _, values_part = line.partition("VALUES")
            values_part = values_part.strip().rstrip(";").strip()
            # Parse individual value tuples
            rows.extend(_split_value_tuples(values_part))

    return rows


def _split_value_tuples(values_str):
    """
    Split a VALUES clause like "(v1,v2),(v3,v4)" into individual tuple strings,
    properly handling parentheses and quotes inside values.
    """
    tuples = []
    depth = 0
    current = []
    i = 0
    while i < len(values_str):
        ch = values_str[i]
        if ch == "(" and depth == 0:
            depth = 1
            current = []
        elif ch == "(" and depth > 0:
            depth += 1
            current.append(ch)
        elif ch == ")" and depth == 1:
            depth = 0
            tuples.append("".join(current))
        elif ch == ")" and depth > 1:
            depth -= 1
            current.append(ch)
        elif ch == "'" and depth > 0:
            # Read a quoted string, handling escaped quotes
            j = i + 1
            parts = ["'"]
            while j < len(values_str):
                c = values_str[j]
                parts.append(c)
                if c == "\\" and j + 1 < len(values_str):
                    parts.append(values_str[j + 1])
                    j += 2
                    continue
                if c == "'":
                    # Check for doubled quote ''
                    if j + 1 < len(values_str) and values_str[j + 1] == "'":
                        parts.append("'")
                        j += 2
                        continue
                    break
                j += 1
            current.append("".join(parts))
            i = j
        elif depth > 0:
            current.append(ch)
        i += 1
    return tuples


def parse_tuple_values(tuple_str):
    """
    Parse a single VALUES tuple string like "'foo',123,NULL,'bar'" into a
    Python list of values (str, int/float, or None).
    """
    values = []
    i = 0
    s = tuple_str
    while i < len(s):
        ch = s[i]
        if ch in (" ", "\t"):
            i += 1
            continue
        if ch == ",":
            i += 1
            continue
        if ch == "'":
            # String value
            j = i + 1
            parts = []
            while j < len(s):
                c = s[j]
                if c == "\\":
                    if j + 1 < len(s):
                        nc = s[j + 1]
                        if nc == "'":
                            parts.append("'")
                        elif nc == "\\":
                            parts.append("\\")
                        elif nc == "n":
                            parts.append("\n")
                        elif nc == "r":
                            parts.append("\r")
                        elif nc == "t":
                            parts.append("\t")
                        else:
                            parts.append(nc)
                        j += 2
                        continue
                if c == "'":
                    if j + 1 < len(s) and s[j + 1] == "'":
                        parts.append("'")
                        j += 2
                        continue
                    break
                parts.append(c)
                j += 1
            values.append("".join(parts))
            i = j + 1
        elif s[i : i + 4].upper() == "NULL":
            values.append(None)
            i += 4
        else:
            # Numeric
            j = i
            while j < len(s) and s[j] not in (",", ")"):
                j += 1
            token = s[i:j].strip()
            try:
                if "." in token:
                    values.append(float(token))
                else:
                    values.append(int(token))
            except ValueError:
                values.append(token)
            i = j
    return values


def to_decimal(val, default="0.00"):
    """Convert a float/string/None to Decimal(15,2), clamping NaN/Inf."""
    if val is None:
        return Decimal(default)
    try:
        d = Decimal(str(val))
        if d.is_nan() or d.is_infinite():
            return Decimal(default)
        return d.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return Decimal(default)


# ──────────────────────────── IMPORT FUNCTIONS ────────────────────────────

class Command(BaseCommand):
    help = "Import core legacy data from transcount.sql (branches, users, customers, suppliers, products)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--sql-file",
            default="/home/steve/pharmacy-aggregator/database/transcount.sql",
            help="Path to the legacy MySQL dump file",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and validate without writing to DB",
        )

    def handle(self, *args, **options):
        sql_file = options["sql_file"]
        dry_run = options["dry_run"]

        if not os.path.exists(sql_file):
            raise CommandError(f"SQL file not found: {sql_file}")

        self.stdout.write(self.style.NOTICE(f"{'[DRY RUN] ' if dry_run else ''}Importing from: {sql_file}"))

        # Ensure the parent Pharmacy exists
        pharmacy, _ = Pharmacy.objects.get_or_create(
            name="Transcounty Pharmacy",
            defaults={
                "address": "Kitale, Trans-Nzoia County",
                "contact_phone": "0720246981",
                "license_number": "TC-LEGACY-001",
            },
        )
        self.stdout.write(f"  Pharmacy: {pharmacy.name} (id={pharmacy.id})")

        with transaction.atomic():
            if dry_run:
                # Create a savepoint we'll roll back
                sid = transaction.savepoint()

            self._import_branches(sql_file, pharmacy)
            self._import_staff(sql_file, pharmacy)
            self._import_customers(sql_file, pharmacy)
            self._import_suppliers(sql_file, pharmacy)
            self._import_products(sql_file, pharmacy)

            if dry_run:
                transaction.savepoint_rollback(sid)
                self.stdout.write(self.style.WARNING("\n[DRY RUN] All changes rolled back."))
            else:
                self.stdout.write(self.style.SUCCESS("\n✅ Core data import completed successfully!"))

    # ────────────── 1. BRANCHES ──────────────

    def _import_branches(self, sql_file, pharmacy):
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Importing Branches ──"))
        rows = parse_inserts(sql_file, "branches")
        created = skipped = 0

        # Map legacy branch names → clean names
        BRANCH_MAP = {
            "TRANSCOUNTY_MAIN": ("Transcounty Main", True),   # is_headquarters
            "TRANSCOUNTY_ANNEX": ("Transcounty Annex", False),
            "PEAKFARM": ("Peakfarm", False),
        }

        for row_str in rows:
            vals = parse_tuple_values(row_str)
            # Schema: id, company, branchname, department, departmenttype
            if len(vals) < 3:
                continue
            legacy_name = vals[2]  # e.g. TRANSCOUNTY_MAIN

            clean_name, is_hq = BRANCH_MAP.get(legacy_name, (legacy_name, False))

            if Branch.objects.filter(name=clean_name, pharmacy=pharmacy).exists():
                skipped += 1
                continue

            Branch.objects.create(
                pharmacy=pharmacy,
                name=clean_name,
                address=f"Kitale, Trans-Nzoia",
                contact_phone="",
                is_headquarters=is_hq,
            )
            created += 1

        self.stdout.write(f"  Created: {created}, Skipped (existing): {skipped}")

    # ────────────── 2. STAFF USERS ──────────────

    def _import_staff(self, sql_file, pharmacy):
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Importing Staff Users ──"))
        rows = parse_inserts(sql_file, "users")
        created = skipped = flagged = 0

        # Legacy privilege mapping
        ROLE_MAP = {
            "Admin": "admin",
            "Standard": "cashier",
        }

        for row_str in rows:
            vals = parse_tuple_values(row_str)
            # Schema: bstype, company, user, password, priviledges, createdby, status,
            #         systemdate, systemtime, R_Addstock, addexpenses, viewexpenses,
            #         accessadminpricingmodes, department, branchname, ...
            if len(vals) < 15:
                continue

            username = str(vals[2]).strip()
            raw_password = str(vals[3]) if vals[3] else ""
            privilege = str(vals[4]) if vals[4] else "Standard"
            status = str(vals[6]) if vals[6] else "Active"
            branch_name = str(vals[14]) if vals[14] else ""

            # Skip if user already exists
            if User.objects.filter(username__iexact=username).exists():
                skipped += 1
                continue

            # Resolve branch
            branch = None
            if branch_name:
                # Map legacy branch column names to our clean names
                clean_map = {
                    "TRANSCOUNTY_MAIN": "Transcounty Main",
                    "TRANSCOUNTY_ANNEX": "Transcounty Annex",
                    "PEAKFARM": "Peakfarm",
                }
                clean = clean_map.get(branch_name, branch_name)
                branch = Branch.objects.filter(name=clean, pharmacy=pharmacy).first()

            role = ROLE_MAP.get(privilege, "cashier")

            # FLAG: plain-text password → bcrypt placeholder
            hashed_pw = make_password(f"LEGACY_CHANGE_ME_{username}")

            User.objects.create(
                username=username,
                password=hashed_pw,
                role=role,
                pharmacy=pharmacy,
                branch=branch,
                is_active=(status == "Active"),
                must_change_password=True,
            )
            created += 1
            flagged += 1  # all legacy users get flagged

        self.stdout.write(f"  Created: {created}, Skipped (existing): {skipped}")
        if flagged:
            self.stdout.write(
                self.style.WARNING(f"  ⚠ {flagged} users imported with bcrypt placeholder passwords (must_change_password=True)")
            )

    # ────────────── 3. CUSTOMERS ──────────────

    def _import_customers(self, sql_file, pharmacy):
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Importing Customers ──"))
        rows = parse_inserts(sql_file, "customers")
        created = skipped = 0

        for row_str in rows:
            vals = parse_tuple_values(row_str)
            # Schema: company, customerid, address, location, phone, balance, id
            if len(vals) < 7:
                continue

            company = str(vals[0]) if vals[0] else ""
            customer_name = str(vals[1]).strip()
            phone = str(vals[4]).strip() if vals[4] else ""
            raw_balance = vals[5]

            # Only import Transcounty customers
            if company != "Transcounty":
                skipped += 1
                continue

            # Build a username from customer name (sanitized)
            username = re.sub(r"[^a-zA-Z0-9_]", "_", customer_name).lower().strip("_")
            if not username:
                username = f"customer_{vals[6]}"

            if User.objects.filter(username__iexact=username).exists():
                skipped += 1
                continue

            balance = to_decimal(raw_balance)

            User.objects.create(
                username=username,
                password=make_password(f"CUSTOMER_NOLOGIN_{username}"),
                first_name=customer_name,
                role="customer",
                pharmacy=pharmacy,
                phone_number=phone[:15] if phone else "",
                credit_balance=balance,
                is_credit_customer=(balance > 0),
                is_active=True,
                must_change_password=True,
            )
            created += 1

        self.stdout.write(f"  Created: {created}, Skipped (existing/non-Transcounty): {skipped}")

    # ────────────── 4. SUPPLIERS ──────────────

    def _import_suppliers(self, sql_file, pharmacy):
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Importing Suppliers ──"))
        rows = parse_inserts(sql_file, "suppliers")
        created = skipped = 0

        for row_str in rows:
            vals = parse_tuple_values(row_str)
            # Schema: company, supplier, contacts, location, abbreviation, balance, id
            if len(vals) < 7:
                continue

            company = str(vals[0]) if vals[0] else ""
            name = str(vals[1]).strip()
            contacts = str(vals[2]).strip() if vals[2] else ""
            location = str(vals[3]).strip() if vals[3] else ""
            raw_balance = vals[5]

            # Only import Transcounty suppliers
            if company != "Transcounty":
                skipped += 1
                continue

            if Supplier.objects.filter(name__iexact=name).exists():
                skipped += 1
                continue

            Supplier.objects.create(
                name=name,
                phone=contacts[:50] if contacts else "",
                address=location,
                balance=to_decimal(raw_balance),
                is_active=True,
            )
            created += 1

        self.stdout.write(f"  Created: {created}, Skipped (existing/non-Transcounty): {skipped}")

    # ────────────── 5. PRODUCTS (from unitsofmeasure) ──────────────

    def _import_products(self, sql_file, pharmacy):
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Importing Products (from unitsofmeasure) ──"))
        rows = parse_inserts(sql_file, "unitsofmeasure")
        created = skipped = pricing_created = 0

        # Pre-fetch branches for stock assignment
        branch_main = Branch.objects.filter(name="Transcounty Main", pharmacy=pharmacy).first()

        for row_str in rows:
            vals = parse_tuple_values(row_str)
            # Schema (21 columns):
            #  0: serialnumber (int)
            #  1: company (varchar)
            #  2: code (varchar) — category name
            #  3: name (varchar) — product name
            #  4: formulation (varchar) — unit of measure / dosage form
            #  5: minimumlevel (float)
            #  6: normalbp (float) — buying price
            #  7: sellingprice (float) — retail price
            #  8: wholesaleprice (float)
            #  9: msp (float) — (not used)
            # 10: description (varchar)
            # 11: expirydate (varchar)
            # 12: location (varchar)
            # 13: department (varchar)
            # 14: shelfno (varchar)
            # 15: TRANSCOUNTY_MAIN (float) — stock at main
            # 16: TRANSCOUNTY_ANNEX (float) — stock at annex
            # 17: PEAKFARM (float) — stock at peakfarm
            # 18: vat_obligation (varchar)
            # 19: online_synch (varchar)

            if len(vals) < 18:
                continue

            company = str(vals[1]) if vals[1] else ""
            if company != "Transcounty":
                skipped += 1
                continue

            product_name = str(vals[3]).strip() if vals[3] else ""
            if not product_name:
                skipped += 1
                continue

            # Check for duplicate by name (case-insensitive)
            if Product.objects.filter(name__iexact=product_name, pharmacy=pharmacy).exists():
                skipped += 1
                continue

            category = str(vals[2]).strip() if vals[2] else None
            formulation = str(vals[4]).strip() if vals[4] else ""
            minimum_level = max(0, int(vals[5] or 0)) if vals[5] else 10
            buying_price = to_decimal(vals[6])
            selling_price = to_decimal(vals[7])
            wholesale_price = to_decimal(vals[8])
            description = str(vals[10]).strip() if vals[10] else ""
            expiry_str = str(vals[11]).strip() if vals[11] else ""
            shelf_no = str(vals[14]).strip() if vals[14] else None
            vat_ob = str(vals[18]).strip() if len(vals) > 18 and vals[18] else None

            # Stock: sum across all branches (clamped to 0)
            stock_main = max(0, int(vals[15] or 0)) if vals[15] is not None else 0
            stock_annex = max(0, int(vals[16] or 0)) if vals[16] is not None else 0
            stock_peak = max(0, int(vals[17] or 0)) if vals[17] is not None else 0
            total_stock = stock_main + stock_annex + stock_peak

            # Parse expiry date
            expiry_date = None
            if expiry_str:
                try:
                    from datetime import datetime
                    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
                        try:
                            expiry_date = datetime.strptime(expiry_str, fmt).date()
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass

            # Map legacy formulation → dosage_form choice
            DOSAGE_MAP = {
                "TABS": "tablet",
                "Tabs": "tablet",
                "tabs": "tablet",
                "CAPSULES": "capsule",
                "Caps": "capsule",
                "caps": "capsule",
                "SYRUP": "syrup",
                "Syrup": "syrup",
                "Injectable": "injection",
                "INJECTABLE": "injection",
                "Cream": "cream",
                "CREAM": "cream",
                "Ointment": "cream",
                "Drops": "drops",
                "DROPS": "drops",
                "Inhaler": "inhaler",
                "INHALER": "inhaler",
                "Solution": "solution",
                "SOLUTION": "solution",
                "Powder": "powder",
                "POWDER": "powder",
            }
            dosage_form = DOSAGE_MAP.get(formulation, "other")

            product = Product.objects.create(
                name=product_name,
                description=description if description else None,
                category=category,
                price=selling_price if selling_price > 0 else Decimal("0.00"),
                dosage_form=dosage_form,
                stock_quantity=total_stock,
                reorder_threshold=minimum_level,
                expiry_date=expiry_date,
                vat_obligation=vat_ob,
                shelf_location=shelf_no,
                pharmacy=pharmacy,
                is_active=True,
            )
            created += 1

            # Create PricingTier if we have a buying price
            if buying_price > 0:
                PricingTier.objects.create(
                    product=product,
                    buying_price=buying_price,
                    # wholesale_price and retail_price are auto-calculated in save()
                )
                pricing_created += 1

        self.stdout.write(f"  Products created: {created}, Skipped: {skipped}")
        self.stdout.write(f"  PricingTiers created: {pricing_created}")
