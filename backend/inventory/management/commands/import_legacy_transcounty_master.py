"""
Management command: import_legacy_transcounty_master

Imports Transcounty-only legacy data from database/transcount.sql into the Django app.

Price source = unitsofmeasure (literal BP/WP/RP)
Stock source = purchases (aggregate TRANSCOUNTY_MAIN / TRANSCOUNTY_ANNEX / PEAKFARM)

Idempotent: safe to re-run. Creates/upserts Products, PricingTier (locked to legacy prices),
and BranchStock rows for the three Transcounty branches.
"""
import os
import json
from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum

from users.models import Pharmacy, Branch
from products.models import Product, PricingTier, BranchStock

# reuse parser helpers from existing import_legacy_core (relative import)
from .import_legacy_core import parse_inserts, parse_tuple_values, to_decimal


def _normalize_name(s):
    if not s:
        return ""
    return " ".join(str(s).strip().upper().split())


class Command(BaseCommand):
    help = "Import Transcounty-only legacy catalog, pricing and branch stock from transcount.sql"

    def add_arguments(self, parser):
        parser.add_argument(
            "--sql-file",
            default="/home/steve/pharmacy-aggregator/database/transcount.sql",
            help="Path to legacy MySQL dump",
        )
        parser.add_argument("--dry-run", action="store_true", help="Parse and report only")

    def handle(self, *args, **options):
        sql_file = options["sql_file"]
        dry_run = options["dry_run"]

        if not os.path.exists(sql_file):
            raise CommandError(f"SQL file not found: {sql_file}")

        self.stdout.write(self.style.NOTICE(f"{('[DRY RUN] ' if dry_run else '')}Importing Transcounty from: {sql_file}"))

        pharmacy, _ = Pharmacy.objects.get_or_create(
            name="Transcounty Pharmacy",
            defaults={
                "address": "Kitale, Trans-Nzoia County",
                "contact_phone": "0720246981",
                "license_number": "TC-LEGACY-001",
            },
        )

        # Ensure branches exist
        branch_map = {
            'TRANSCOUNTY_MAIN': 'Transcounty Main',
            'TRANSCOUNTY_ANNEX': 'Transcounty Annex',
            'PEAKFARM': 'Peakfarm',
        }
        branches = {}
        for legacy, clean in branch_map.items():
            b, _ = Branch.objects.get_or_create(pharmacy=pharmacy, name=clean, defaults={'is_headquarters': legacy == 'TRANSCOUNTY_MAIN'})
            branches[clean] = b

        report = {
            'products_processed': 0,
            'pricing_tiers_upserted': 0,
            'branch_stock_rows_upserted': 0,
            'per_branch_counts': {},
            'unmatched_purchase_names': [],
        }

        with transaction.atomic():
            if dry_run:
                sid = transaction.savepoint()

            # 1) Build product map from unitsofmeasure and upsert products + pricing tiers
            u_rows = parse_inserts(sql_file, 'unitsofmeasure')
            product_map = {}
            created_products = 0
            pricing_upsert = 0

            for row_str in u_rows:
                vals = parse_tuple_values(row_str)
                if len(vals) < 9:
                    continue
                company = str(vals[1]) if vals[1] else ''
                if company != 'Transcounty':
                    continue
                legacy_name = str(vals[3]).strip() if vals[3] else ''
                if not legacy_name:
                    continue
                norm = _normalize_name(legacy_name)

                # Upsert Product by case-insensitive name
                product, created = Product.objects.get_or_create(
                    name__iexact=legacy_name,
                    defaults={
                        'name': legacy_name,
                        'description': str(vals[10]).strip() if len(vals) > 10 and vals[10] else None,
                        'price': Decimal('0.00'),
                        'pharmacy': pharmacy,
                        'is_active': True,
                    },
                ) if False else None
                # Django doesn't support get_or_create with name__iexact directly; try find then create
                product = Product.objects.filter(name__iexact=legacy_name, pharmacy=pharmacy).first()
                if not product:
                    product = Product.objects.create(
                        name=legacy_name,
                        description=str(vals[10]).strip() if len(vals) > 10 and vals[10] else None,
                        price=to_decimal(vals[7]),
                        pharmacy=pharmacy,
                        is_active=True,
                    )
                    created_products += 1

                product_map[norm] = product

                # Pricing values
                buying_price = to_decimal(vals[6])
                retail_price = to_decimal(vals[7])
                wholesale_price = to_decimal(vals[8])

                # Upsert PricingTier with legacy lock
                pt, created_pt = PricingTier.objects.update_or_create(
                    product=product,
                    defaults={
                        'buying_price': buying_price,
                        'wholesale_price': wholesale_price,
                        'retail_price': retail_price,
                        'use_legacy_prices': True,
                        'is_active': True,
                    },
                )
                pricing_upsert += 1

                # Ensure product.price is set to retail_price (display/sales default)
                product.price = retail_price
                product.save(update_fields=['price'])

            report['products_processed'] = len(product_map)
            report['pricing_tiers_upserted'] = pricing_upsert

            # 2) Rebuild BranchStock from purchases table
            purchase_rows = parse_inserts(sql_file, 'purchases')
            # accumulator: {(product_id, branch_name): qty}
            acc = {}
            unmatched = set()
            for row_str in purchase_rows:
                vals = parse_tuple_values(row_str)
                if len(vals) < 22:
                    continue
                company = str(vals[0]) if vals[0] else ''
                if company != 'Transcounty':
                    continue
                commitstatus = str(vals[16]).strip() if vals[16] else ''
                # respect submitted lines only
                if commitstatus.lower() != 'submitted':
                    continue
                purchase_name = str(vals[2]).strip() if vals[2] else ''
                norm = _normalize_name(purchase_name)
                product = product_map.get(norm)
                if not product:
                    unmatched.add(purchase_name)
                    continue

                # branch qtys at indices 19/20/21
                try:
                    q_main = int(max(0, float(vals[19] or 0)))
                except Exception:
                    q_main = 0
                try:
                    q_annex = int(max(0, float(vals[20] or 0)))
                except Exception:
                    q_annex = 0
                try:
                    q_peak = int(max(0, float(vals[21] or 0)))
                except Exception:
                    q_peak = 0

                if q_main:
                    acc.setdefault((product.id, 'Transcounty Main'), 0)
                    acc[(product.id, 'Transcounty Main')] += q_main
                if q_annex:
                    acc.setdefault((product.id, 'Transcounty Annex'), 0)
                    acc[(product.id, 'Transcounty Annex')] += q_annex
                if q_peak:
                    acc.setdefault((product.id, 'Peakfarm'), 0)
                    acc[(product.id, 'Peakfarm')] += q_peak

            report['unmatched_purchase_names'] = list(unmatched)[:50]

            # Upsert branch stocks for all products × 3 branches (recommended: create zeros where absent)
            bs_count = 0
            for norm, product in product_map.items():
                # compute sums
                for branch_name in ('Transcounty Main', 'Transcounty Annex', 'Peakfarm'):
                    qty = acc.get((product.id, branch_name), 0)
                    # ensure non-negative integer
                    qty = max(0, int(qty))
                    bs, created_bs = BranchStock.objects.update_or_create(
                        product=product,
                        branch=branches[branch_name],
                        defaults={'quantity': Decimal(qty), 'reorder_level': Decimal('0.00')},
                    )
                    bs_count += 1

                # optional: set product.stock_quantity to sum of branch stocks for backward-compat
                total = sum(int(acc.get((product.id, b), 0)) for b in ('Transcounty Main', 'Transcounty Annex', 'Peakfarm'))
                product.stock_quantity = max(0, int(total))
                product.save(update_fields=['stock_quantity'])

            report['branch_stock_rows_upserted'] = bs_count

            # per-branch counts
            for bn, b in branches.items():
                rows = BranchStock.objects.filter(branch=b)
                products_with_stock_gt_0 = rows.filter(quantity__gt=0).count()
                total_rows = rows.count()
                sum_qty = rows.aggregate(total=Sum('quantity'))['total'] or Decimal('0')
                report['per_branch_counts'][bn] = {
                    'products_with_stock_gt_0': products_with_stock_gt_0,
                    'total_branch_stock_rows': total_rows,
                    'sum_quantity': int(sum_qty),
                }

            if dry_run:
                transaction.savepoint_rollback(sid)
                self.stdout.write(self.style.WARNING("\n[DRY RUN] All changes rolled back."))
            else:
                self.stdout.write(self.style.SUCCESS("\n✅ Transcounty legacy import completed."))

        # write report to file
        out_path = '/tmp/transcounty_import_report.json'
        with open(out_path, 'w', encoding='utf-8') as rf:
            json.dump(report, rf, indent=2)

        self.stdout.write(f"Report written: {out_path}")
        # also print a brief summary
        self.stdout.write(json.dumps(report['per_branch_counts'], indent=2))
