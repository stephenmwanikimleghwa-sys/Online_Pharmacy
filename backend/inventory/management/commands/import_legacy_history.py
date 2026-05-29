"""
Management command: import_legacy_history
Imports historical transactions from transcount.sql into the new system.

Phase 2 — Historical Data:
  1. Dispensations & Items (from `sales`) -> ~51k rows
  2. Stock Intakes (from `purchases`) -> ~11k rows
  3. Stock Logs (from `stockflow`) -> ~35k rows
  4. CashFlow (from `cashflow`) -> ~15k rows

Uses bulk_create to:
  a) Significantly speed up the import process.
  b) Bypass .save() overrides that would improperly alter current stock levels
     which were already correctly set during Phase 1 from `unitsofmeasure`.
"""

import re
import os
import sys
from datetime import datetime, date
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.timezone import make_aware

from users.models import Pharmacy, Branch, User
from products.models import Product, StockLog
from inventory.models.dispensing import Dispensation, DispensationItem
from inventory.models.stock_intake import StockIntake
from inventory.models.finance import CashFlow, LegacyLedgerEntry
from inventory.models.returns import ProductReturn

# ──────────────────────────── PARSER UTILS ────────────────────────────
def parse_inserts(filepath, table_name):
    rows = []
    pattern = re.compile(rf"INSERT\s+INTO\s+`?{re.escape(table_name)}`?\s+VALUES\s*", re.IGNORECASE)
    with open(filepath, "r", encoding="latin1") as f:
        for line in f:
            if not pattern.match(line):
                continue
            _, _, values_part = line.partition("VALUES")
            values_part = values_part.strip().rstrip(";").strip()
            rows.extend(_split_value_tuples(values_part))
    return rows

def _split_value_tuples(values_str):
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
            j = i + 1
            parts = []
            while j < len(s):
                c = s[j]
                if c == "\\":
                    if j + 1 < len(s):
                        nc = s[j + 1]
                        if nc == "'": parts.append("'")
                        elif nc == "\\": parts.append("\\")
                        elif nc == "n": parts.append("\n")
                        elif nc == "r": parts.append("\r")
                        elif nc == "t": parts.append("\t")
                        else: parts.append(nc)
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
            j = i
            while j < len(s) and s[j] not in (",", ")"):
                j += 1
            token = s[i:j].strip()
            try:
                if "." in token: values.append(float(token))
                else: values.append(int(token))
            except ValueError:
                values.append(token)
            i = j
    return values

def to_decimal(val, default="0.00"):
    if val is None: return Decimal(default)
    try:
        d = Decimal(str(val))
        if d.is_nan() or d.is_infinite(): return Decimal(default)
        return d.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return Decimal(default)

def parse_date(date_str):
    if not date_str: return None
    date_str = str(date_str).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None

def parse_datetime(date_str, time_str):
    if not date_str:
        return timezone.now()
    d = parse_date(date_str)
    if not d:
        return timezone.now()
    t = None
    if time_str:
        time_str = str(time_str).strip()
        for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%H:%M:%S.%f"):
            try:
                t = datetime.strptime(time_str, fmt).time()
                break
            except ValueError:
                continue
    dt = datetime.combine(d, t) if t else datetime.combine(d, datetime.min.time())
    return make_aware(dt)

# ──────────────────────────── IMPORT COMMAND ────────────────────────────

class Command(BaseCommand):
    help = "Import historical transactions from transcount.sql"

    def add_arguments(self, parser):
        parser.add_argument("--sql-file", default="/home/steve/pharmacy-aggregator/database/transcount.sql")

    def handle(self, *args, **options):
        sql_file = options["sql_file"]
        if not os.path.exists(sql_file):
            raise CommandError(f"SQL file not found: {sql_file}")

        self.stdout.write(self.style.NOTICE(f"Importing history from: {sql_file}"))

        pharmacy = Pharmacy.objects.filter(name__icontains="Transcounty").first()
        if not pharmacy:
            raise CommandError("Transcounty Pharmacy not found! Run import_legacy_core first.")

        # Cache reference data to avoid DB lookups in loops
        self.branches_map = {
            "TRANSCOUNTY_MAIN": Branch.objects.filter(name="Transcounty Main", pharmacy=pharmacy).first(),
            "TRANSCOUNTY_ANNEX": Branch.objects.filter(name="Transcounty Annex", pharmacy=pharmacy).first(),
            "PEAKFARM": Branch.objects.filter(name="Peakfarm", pharmacy=pharmacy).first(),
        }
        self.products_map = {p.name.lower(): p for p in Product.objects.filter(pharmacy=pharmacy)}
        self.users_map = {u.username.lower(): u for u in User.objects.filter(pharmacy=pharmacy)}
        self.default_user = User.objects.filter(pharmacy=pharmacy, role='admin').first()

        with transaction.atomic():
            self._import_sales(sql_file)
            self._import_purchases(sql_file)
            self._import_cashflow(sql_file)
            
            self.stdout.write(self.style.SUCCESS("\n✅ Historical data import completed successfully!"))

    # ────────────── 1. SALES -> DISPENSATIONS ──────────────
    def _import_sales(self, sql_file):
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Importing Sales (Dispensations) ──"))
        rows = parse_inserts(sql_file, "sales")
        
        dispensations_to_create = []
        items_to_create = []
        skipped = 0

        # Since legacy sales is denormalized (one row per item, but sharing receiptno), 
        # we will group by receiptno to reconstruct the Dispensation headers.
        receipts = {}
        
        for row_str in rows:
            vals = parse_tuple_values(row_str)
            # Schema: 
            # 0: company, 1: id, 2: code, 3: name, 4: description, 5: expirydate, 
            # 6: numofunitsold, 7: costperunit, 8: sellingprice, 9: systemdate, 
            # 10: seller, 11: systemtime, 12: bid, 13: receiptno, 14: salecategory, 
            # 15: discount, 16: commitstatus, 17: holdno, 18: invoiceno, 
            # 19: vat_obligation, 20: qbs, 21: qas, 22: branchname, 23: department,
            # 24: CASH, 25: MPESA_TILL, 26: EQUITY_TILL, 27: NATIONAL_BANK, 28: CREDIT
            if len(vals) < 29: continue
            if str(vals[0]) != "Transcounty": continue
            
            product_name = str(vals[3]).strip()
            product = self.products_map.get(product_name.lower())
            if not product:
                skipped += 1
                continue
                
            qty = max(0, int(vals[6] or 0))
            price_per_unit = to_decimal(vals[8])
            discount = to_decimal(vals[15])
            
            receipt_no = str(vals[13]) if vals[13] else f"LEGACY_{vals[1]}"
            seller_username = str(vals[10]).lower()
            seller = self.users_map.get(seller_username, self.default_user)
            branch = self.branches_map.get(str(vals[22]), self.branches_map["TRANSCOUNTY_MAIN"])
            
            dt = parse_datetime(vals[9], vals[11])
            
            # Determine payment mode from the float columns
            pmode = "CASH"
            if to_decimal(vals[25]) > 0: pmode = "MPESA_TILL"
            elif to_decimal(vals[26]) > 0: pmode = "EQUITY_TILL"
            elif to_decimal(vals[27]) > 0: pmode = "NATIONAL_BANK"
            elif to_decimal(vals[28]) > 0: pmode = "CREDIT"
            elif to_decimal(vals[24]) > 0: pmode = "CASH"

            total_line_price = (qty * price_per_unit) - discount

            if receipt_no not in receipts:
                dispensation = Dispensation(
                    id=vals[1], # Preserving legacy ID if possible, else auto
                    sale_type='otc',
                    branch=branch,
                    patient_name="",
                    dispensed_by=seller,
                    dispensed_at=dt,
                    total_amount=total_line_price,
                    payment_mode=pmode,
                    discount=discount,
                )
                receipts[receipt_no] = dispensation
            else:
                receipts[receipt_no].total_amount += total_line_price
                receipts[receipt_no].discount += discount

            items_to_create.append(DispensationItem(
                dispensation_id=receipts[receipt_no].id, # Use the header's ID, not the individual row's ID
                product=product,
                quantity=qty,
                price_per_unit=price_per_unit,
                total_price=qty * price_per_unit,
            ))

        # Bulk create Dispensations
        Dispensation.objects.bulk_create(receipts.values(), batch_size=2000, ignore_conflicts=True)
        # Bulk create Items
        DispensationItem.objects.bulk_create(items_to_create, batch_size=5000, ignore_conflicts=True)
        
        self.stdout.write(f"  Created: {len(receipts)} Sales, {len(items_to_create)} Items (Skipped missing products: {skipped})")

    # ────────────── 2. PURCHASES -> STOCK INTAKES ──────────────
    def _import_purchases(self, sql_file):
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Importing Purchases (Stock Intakes) ──"))
        rows = parse_inserts(sql_file, "purchases")
        
        intakes = []
        skipped = 0
        
        for row_str in rows:
            vals = parse_tuple_values(row_str)
            # Schema: 0:company, 1:id, 2:name, 3:description, 4:expirydate, 5:numofunitsbought, 
            # 6:costperunit, 7:sellingprice, 8:systemdate, 9:addedby, 10:receiptno, 11:systemtime, 
            # 12:supplier, ...
            if len(vals) < 13: continue
            if str(vals[0]) != "Transcounty": continue
            
            product_name = str(vals[2]).strip()
            product = self.products_map.get(product_name.lower())
            if not product:
                skipped += 1
                continue
                
            qty = max(0, int(vals[5] or 0))
            cost = to_decimal(vals[6])
            dt = parse_datetime(vals[8], vals[11])
            supplier = str(vals[12]) if vals[12] else "Unknown"
            
            # Determine branch based on float flags
            branch = self.branches_map["TRANSCOUNTY_MAIN"]
            if len(vals) >= 22:
                if to_decimal(vals[20]) > 0: branch = self.branches_map["TRANSCOUNTY_ANNEX"]
                elif to_decimal(vals[21]) > 0: branch = self.branches_map["PEAKFARM"]
            
            added_by = self.users_map.get(str(vals[9]).lower(), self.default_user)
            
            intakes.append(StockIntake(
                id=vals[1],
                product=product,
                branch=branch,
                distributor_name=supplier[:255],
                quantity_received=qty,
                unit_cost=cost,
                total_cost=qty * cost,
                expiry_date=parse_date(vals[4]),
                received_date=dt,
                received_by=added_by
            ))
            
        StockIntake.objects.bulk_create(intakes, batch_size=2000, ignore_conflicts=True)
        self.stdout.write(f"  Created: {len(intakes)} Stock Intakes (Skipped: {skipped})")

    # ────────────── 3. CASHFLOW ──────────────
    def _import_cashflow(self, sql_file):
        self.stdout.write(self.style.MIGRATE_HEADING("\n── Importing Cashflow ──"))
        rows = parse_inserts(sql_file, "cashflow")
        
        flows = []
        
        for row_str in rows:
            vals = parse_tuple_values(row_str)
            # Schema: 0:company, 1:id, 2:netflow, 3:systemtime, 4:systemdate, 5:user, 
            # 6:explanation, 7:paymentmode, ... 10:branchname
            if len(vals) < 11: continue
            if str(vals[0]) != "Transcounty": continue
            
            netflow = to_decimal(vals[2])
            dt = parse_datetime(vals[4], vals[3])
            explanation = str(vals[6]) if vals[6] else ""
            pmode = str(vals[7]) if vals[7] else "UNKNOWN"
            branch = self.branches_map.get(str(vals[10]), self.branches_map["TRANSCOUNTY_MAIN"])
            
            flows.append(CashFlow(
                id=vals[1],
                netflow=netflow,
                paymentmode=pmode[:100],
                explanation=explanation[:255],
                branch=branch,
                timestamp=dt
            ))
            
        CashFlow.objects.bulk_create(flows, batch_size=2000, ignore_conflicts=True)
        self.stdout.write(f"  Created: {len(flows)} CashFlow records")
