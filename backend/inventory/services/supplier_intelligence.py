from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, Count, Max, Sum
from django.utils import timezone

from inventory.models.stock_intake import StockIntake
from inventory.models.dispensing import DispensationItem
from products.models import Product


TREND_THRESHOLD = Decimal("0.05")


def _price_trend(last_price, average_price):
    if not average_price or average_price == 0:
        return "STABLE"
    diff_ratio = (Decimal(str(last_price)) - Decimal(str(average_price))) / Decimal(
        str(average_price)
    )
    if diff_ratio > TREND_THRESHOLD:
        return "RISING"
    if diff_ratio < -TREND_THRESHOLD:
        return "FALLING"
    return "STABLE"


def compare_suppliers_for_product(product_id):
    product = Product.objects.filter(pk=product_id).first()
    if not product:
        return None

    intakes = (
        StockIntake.objects.filter(product_id=product_id)
        .select_related("supplier")
        .order_by("-received_date")
    )

    supplier_map = {}
    for intake in intakes:
        sid = intake.supplier_id
        if sid not in supplier_map:
            supplier_map[sid] = {
                "supplier_id": sid,
                "supplier_name": intake.supplier.name,
                "prices": [],
                "dates": [],
            }
        supplier_map[sid]["prices"].append(float(intake.unit_cost))
        supplier_map[sid]["dates"].append(intake.received_date.date().isoformat())

    if not supplier_map:
        return {
            "product": {"id": product.id, "name": product.name},
            "comparison": [],
            "cheapest_supplier": None,
            "most_expensive_supplier": None,
            "price_range": {"min": 0, "max": 0, "difference": 0},
        }

    comparison = []
    for sid, data in supplier_map.items():
        prices = data["prices"]
        last_price = prices[0]
        avg_price = sum(prices) / len(prices)
        history = [
            {"date": d, "price": p}
            for d, p in zip(data["dates"], data["prices"])
        ]
        comparison.append(
            {
                "supplier_id": sid,
                "supplier_name": data["supplier_name"],
                "last_price": round(last_price, 2),
                "last_date": data["dates"][0],
                "average_price": round(avg_price, 2),
                "times_supplied": len(prices),
                "trend": _price_trend(last_price, avg_price),
                "price_history": history,
                "is_cheapest": False,
                "savings_vs_expensive": 0,
            }
        )

    comparison.sort(key=lambda x: x["last_price"])
    min_price = comparison[0]["last_price"]
    max_price = comparison[-1]["last_price"]
    for row in comparison:
        row["is_cheapest"] = row["last_price"] == min_price
        row["savings_vs_expensive"] = round(max_price - row["last_price"], 2)

    return {
        "product": {"id": product.id, "name": product.name},
        "comparison": comparison,
        "cheapest_supplier": comparison[0]["supplier_name"],
        "most_expensive_supplier": comparison[-1]["supplier_name"],
        "price_range": {
            "min": min_price,
            "max": max_price,
            "difference": round(max_price - min_price, 2),
        },
    }


def supplier_products_summary(supplier_id):
    qs = (
        StockIntake.objects.filter(supplier_id=supplier_id)
        .values("product_id", "product__name")
        .annotate(
            last_price=Max("unit_cost"),
            times_bought=Count("id"),
            avg_price=Avg("unit_cost"),
            last_date=Max("received_date"),
        )
        .order_by("product__name")
    )

    rows = []
    for row in qs:
        intakes = (
            StockIntake.objects.filter(
                supplier_id=supplier_id, product_id=row["product_id"]
            )
            .order_by("-received_date")[:20]
        )
        last_intake = intakes.first()
        last_price = float(last_intake.unit_cost) if last_intake else 0
        avg_price = float(row["avg_price"] or 0)
        rows.append(
            {
                "product_id": row["product_id"],
                "product_name": row["product__name"],
                "last_price": round(last_price, 2),
                "last_date": (
                    last_intake.received_date.date().isoformat()
                    if last_intake
                    else None
                ),
                "times_bought": row["times_bought"],
                "avg_price": round(avg_price, 2),
                "trend": _price_trend(last_price, avg_price),
                "price_history": [
                    {
                        "date": i.received_date.date().isoformat(),
                        "price": float(i.unit_cost),
                    }
                    for i in intakes
                ],
            }
        )
    return rows


def last_price_for_supplier_product(product_id, supplier_id):
    intakes = StockIntake.objects.filter(
        product_id=product_id, supplier_id=supplier_id
    ).order_by("-received_date")
    last = intakes.first()
    comparison = compare_suppliers_for_product(product_id)
    cheapest = (comparison or {}).get("comparison", [{}])[0] if comparison else {}
    best_row = None
    if comparison:
        for row in comparison.get("comparison", []):
            if row.get("is_cheapest"):
                best_row = row
                break
    return {
        "last_price": float(last.unit_cost) if last else None,
        "last_date": last.received_date.date().isoformat() if last else None,
        "best_price": best_row["last_price"] if best_row else None,
        "best_supplier": best_row["supplier_name"] if best_row else None,
        "best_date": best_row["last_date"] if best_row else None,
        "price_history": [
            {
                "date": i.received_date.date().isoformat(),
                "price": float(i.unit_cost),
            }
            for i in intakes[:5]
        ],
    }


def suggested_order_quantity(product_id, branch_id):
    """Average monthly sales over last 3 months × 2, rounded up to nearest 50."""
    three_months_ago = timezone.now() - timedelta(days=90)
    total_sold = (
        DispensationItem.objects.filter(
            product_id=product_id,
            dispensation__branch_id=branch_id,
            dispensation__dispensed_at__gte=three_months_ago,
        ).aggregate(total=Sum("quantity"))["total"]
        or 0
    )
    monthly_avg = float(total_sold) / 3.0
    suggested = monthly_avg * 2
    if suggested <= 0:
        suggested = 100
    rounded = int((suggested + 49) // 50) * 50
    return max(rounded, 50)


def supplier_scorecard(supplier_id):
    from inventory.models.supplier import Supplier

    supplier = Supplier.objects.filter(pk=supplier_id).first()
    if not supplier:
        return None

    twelve_months_ago = timezone.now() - timedelta(days=365)
    supplier_intakes = StockIntake.objects.filter(
        supplier_id=supplier_id, received_date__gte=twelve_months_ago
    )
    product_ids = list(
        supplier_intakes.values_list("product_id", flat=True).distinct()
    )
    total_products_catalog = Product.objects.filter(is_active=True).count() or 1

    cheapest_count = 0
    not_cheapest_count = 0
    monthly_savings = Decimal("0")

    for pid in product_ids:
        comp = compare_suppliers_for_product(pid)
        if not comp or not comp.get("comparison"):
            continue
        for row in comp["comparison"]:
            if row["supplier_id"] == supplier_id:
                if row["is_cheapest"]:
                    cheapest_count += 1
                else:
                    not_cheapest_count += 1
                    monthly_savings += Decimal(str(row["savings_vs_expensive"]))
                break

    total_supplied = len(product_ids)
    price_competitiveness = (
        (cheapest_count / total_supplied * 100) if total_supplied else 0
    )

    order_count = supplier_intakes.values("invoice_number").distinct().count()
    if order_count == 0:
        order_count = supplier_intakes.count()
    max_orders = (
        StockIntake.objects.filter(received_date__gte=twelve_months_ago)
        .values("supplier_id")
        .annotate(c=Count("id"))
        .aggregate(m=Max("c"))["m"]
        or 1
    )
    order_frequency = min(100, (order_count / max_orders) * 100)

    product_range = min(100, (total_supplied / total_products_catalog) * 100)

    # Price stability: average absolute % change between consecutive intakes
    stability_scores = []
    for pid in product_ids:
        prices = list(
            StockIntake.objects.filter(supplier_id=supplier_id, product_id=pid)
            .order_by("received_date")
            .values_list("unit_cost", flat=True)
        )
        if len(prices) < 2:
            stability_scores.append(100)
            continue
        changes = []
        for i in range(1, len(prices)):
            prev, curr = Decimal(str(prices[i - 1])), Decimal(str(prices[i]))
            if prev > 0:
                changes.append(abs((curr - prev) / prev * 100))
        avg_change = sum(changes) / len(changes) if changes else 0
        stability_scores.append(max(0, 100 - float(avg_change)))

    price_stability = (
        sum(stability_scores) / len(stability_scores) if stability_scores else 80
    )

    overall = (
        price_competitiveness * 0.4
        + order_frequency * 0.2
        + product_range * 0.2
        + price_stability * 0.2
    )

    return {
        "supplier_id": supplier_id,
        "supplier_name": supplier.name,
        "overall_score": round(overall, 1),
        "price_competitiveness": round(price_competitiveness, 1),
        "order_frequency": round(order_frequency, 1),
        "product_range": round(product_range, 1),
        "price_stability": round(price_stability, 1),
        "orders_last_12_months": order_count,
        "products_supplied": total_supplied,
        "products_cheapest": cheapest_count,
        "products_not_cheapest": not_cheapest_count,
        "potential_monthly_savings": float(monthly_savings),
    }


def procurement_analytics():
    """
    Full procurement analytics report.

    Performance strategy:
    - ALL StockIntake rows for the last 12 months are fetched in ONE query.
    - Supplier comparison is done in Python (no per-product DB loops).
    - Result is cached for 15 minutes to avoid recomputing on every page load.
    """
    from django.core.cache import cache
    from inventory.models.supplier import Supplier

    CACHE_KEY = "procurement_analytics_v2"
    CACHE_TTL = 60 * 15  # 15 minutes

    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return cached

    twelve_months_ago = timezone.now() - timedelta(days=365)
    three_months_ago = timezone.now() - timedelta(days=90)

    # ── 1. Bulk fetch all intakes for the year ──────────────────────────────
    intakes = list(
        StockIntake.objects.filter(received_date__gte=twelve_months_ago)
        .select_related("supplier")
        .values(
            "id",
            "product_id",
            "supplier_id",
            "supplier__name",
            "unit_cost",
            "total_cost",
            "received_date",
            "invoice_number",
        )
        .order_by("product_id", "supplier_id", "-received_date")
    )

    # ── 2. Spending by supplier ─────────────────────────────────────────────
    supplier_spend: dict = {}
    for row in intakes:
        sid = row["supplier_id"]
        if sid not in supplier_spend:
            supplier_spend[sid] = {
                "supplier_id": sid,
                "supplier_name": row["supplier__name"],
                "total_spent": 0.0,
                "order_count": 0,
            }
        supplier_spend[sid]["total_spent"] += float(row["total_cost"] or 0)
        supplier_spend[sid]["order_count"] += 1

    spending_by_supplier = sorted(
        supplier_spend.values(), key=lambda x: x["total_spent"], reverse=True
    )
    total_spend = sum(s["total_spent"] for s in spending_by_supplier)
    for row in spending_by_supplier:
        row["pct_of_total"] = (
            round(row["total_spent"] / total_spend * 100, 1) if total_spend else 0
        )

    # ── 3. Monthly avg cost trend ───────────────────────────────────────────
    monthly: dict = {}
    for row in intakes:
        month_key = row["received_date"].strftime("%Y-%m")
        monthly.setdefault(month_key, []).append(float(row["unit_cost"]))
    price_trend = [
        {"month": k, "avg_price": round(sum(v) / len(v), 2)}
        for k, v in sorted(monthly.items())
    ]

    # ── 4. Group intakes by product × supplier (for savings calc) ──────────
    # Structure: { product_id: { supplier_id: [unit_cost, ...] } }
    product_supplier_prices: dict = {}
    product_supplier_meta: dict = {}  # stores name and order of first occurrence
    for row in intakes:
        pid = row["product_id"]
        sid = row["supplier_id"]
        product_supplier_prices.setdefault(pid, {}).setdefault(sid, []).append(
            float(row["unit_cost"])
        )
        product_supplier_meta.setdefault(pid, {}).setdefault(
            sid,
            {
                "supplier_name": row["supplier__name"],
                "last_price": float(row["unit_cost"]),  # first = most recent (ordered DESC)
                "times_supplied": 0,
            },
        )
        product_supplier_meta[pid][sid]["times_supplied"] += 1

    # ── 5. Bulk fetch 3-month usage per product in ONE query ────────────────
    from django.db.models import Sum as _Sum
    usage_qs = (
        DispensationItem.objects.filter(
            dispensation__dispensed_at__gte=three_months_ago,
        )
        .values("product_id")
        .annotate(total=_Sum("quantity"))
    )
    product_usage = {row["product_id"]: float(row["total"] or 0) / 3.0 for row in usage_qs}

    # ── 6. Compute potential savings in Python (no extra DB hits) ───────────
    savings_rows = []
    for pid, supplier_data in product_supplier_prices.items():
        if len(supplier_data) < 2:
            continue  # only one supplier — no alternative to compare
        meta = product_supplier_meta[pid]

        # Build a summary list sorted by last_price ascending
        comparison = sorted(
            [
                {
                    "supplier_id": sid,
                    "supplier_name": meta[sid]["supplier_name"],
                    "last_price": meta[sid]["last_price"],
                    "times_supplied": meta[sid]["times_supplied"],
                }
                for sid in supplier_data
            ],
            key=lambda x: x["last_price"],
        )
        cheapest = comparison[0]
        # "current" = most frequently used supplier
        current = max(comparison, key=lambda x: x["times_supplied"])

        if cheapest["supplier_id"] == current["supplier_id"]:
            continue  # already using cheapest supplier

        monthly_usage = product_usage.get(pid, 0)
        price_diff = current["last_price"] - cheapest["last_price"]
        if price_diff <= 0:
            continue

        monthly_saving = price_diff * monthly_usage
        # Fetch product name lazily from first intake meta
        product_name = (
            Product.objects.filter(pk=pid).values_list("name", flat=True).first()
            or f"Product #{pid}"
        )
        savings_rows.append(
            {
                "product_id": pid,
                "product_name": product_name,
                "current_supplier": current["supplier_name"],
                "current_price": round(current["last_price"], 2),
                "cheapest_supplier": cheapest["supplier_name"],
                "cheapest_price": round(cheapest["last_price"], 2),
                "monthly_usage": round(monthly_usage, 1),
                "monthly_saving": round(monthly_saving, 2),
                "annual_saving": round(monthly_saving * 12, 2),
            }
        )

    savings_rows.sort(key=lambda x: x["annual_saving"], reverse=True)
    total_annual = sum(r["annual_saving"] for r in savings_rows)

    # ── 7. Supplier dependency alerts ───────────────────────────────────────
    product_supplier_sets: dict = {}
    for row in intakes:
        product_supplier_sets.setdefault(row["product_id"], set()).add(row["supplier_id"])

    single_source: dict = {}
    for pid, sids in product_supplier_sets.items():
        if len(sids) == 1:
            sid = next(iter(sids))
            single_source[sid] = single_source.get(sid, 0) + 1

    total_unique = len(product_supplier_sets) or 1
    dependency_alerts = []
    if single_source:
        # Fetch names for all flagged suppliers in ONE query
        flagged_ids = list(single_source.keys())
        supplier_names = dict(
            Supplier.objects.filter(pk__in=flagged_ids).values_list("id", "name")
        )
        for sid, count in single_source.items():
            pct = count / total_unique * 100
            if pct > 40:
                dependency_alerts.append(
                    {
                        "supplier_id": sid,
                        "supplier_name": supplier_names.get(sid, f"Supplier #{sid}"),
                        "pct": round(pct, 1),
                    }
                )

    result = {
        "spending_by_supplier": spending_by_supplier,
        "price_trend": price_trend,
        "potential_savings": savings_rows,
        "total_annual_savings": round(total_annual, 2),
        "dependency_alerts": dependency_alerts,
    }
    cache.set(CACHE_KEY, result, CACHE_TTL)
    return result
