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
    qty_map = bulk_suggested_order_quantities([product_id], branch_id)
    return qty_map.get(product_id, 100)


def bulk_suggested_order_quantities(product_ids, branch_id=None):
    """Map product_id -> suggested order qty using one usage query."""
    ids = [int(pid) for pid in product_ids if pid is not None]
    if not ids:
        return {}
    three_months_ago = timezone.now() - timedelta(days=90)
    qs = DispensationItem.objects.filter(
        product_id__in=ids,
        dispensation__dispensed_at__gte=three_months_ago,
    )
    if branch_id is not None:
        qs = qs.filter(dispensation__branch_id=branch_id)
    usage = {
        row["product_id"]: float(row["t"] or 0)
        for row in qs.values("product_id").annotate(t=Sum("quantity"))
    }
    out = {}
    for pid in ids:
        monthly_avg = usage.get(pid, 0.0) / 3.0
        suggested = monthly_avg * 2
        if suggested <= 0:
            suggested = 100
        rounded = int((suggested + 49) // 50) * 50
        out[pid] = max(rounded, 50)
    return out


def _reason_for_reorder(cheapest, usual_supplier):
    if cheapest and usual_supplier and cheapest["supplier_id"] != usual_supplier["supplier_id"]:
        save = round(
            float(usual_supplier["last_price"]) - float(cheapest["last_price"]), 2
        )
        if save > 0:
            return (
                f"Order from {cheapest['supplier_name']} — they were cheapest at "
                f"KES {cheapest['last_price']:,.2f}. Last time you used "
                f"{usual_supplier['supplier_name']} at KES {usual_supplier['last_price']:,.2f} "
                f"(save about KES {save:,.2f} per unit)."
            )
        return (
            f"Order from {cheapest['supplier_name']} — best recorded price "
            f"KES {cheapest['last_price']:,.2f}."
        )
    if cheapest:
        times = cheapest.get("times_supplied") or 0
        reason = (
            f"Order from {cheapest['supplier_name']} — best price in your history "
            f"(KES {cheapest['last_price']:,.2f}"
            + (f", bought {times} time(s)" if times else "")
            + ")."
        )
        if cheapest.get("trend") == "RISING":
            reason += " Note: their price has been rising lately."
        elif cheapest.get("trend") == "FALLING":
            reason += " Good news: their price has been falling."
        return reason
    if usual_supplier:
        return (
            f"Order from {usual_supplier['supplier_name']} — they supplied this last "
            f"(KES {usual_supplier['last_price']:,.2f}). No other supplier history yet to compare."
        )
    return (
        "No supplier history for this product yet. Choose any supplier when you create the order, "
        "and record the delivery under Stock received so next time we can recommend the cheapest."
    )


def bulk_reorder_intelligence(product_ids, branch_id=None, include_comparison=False):
    """
    Build reorder tips for many products with a few queries (not N+1).

    Returns {product_id: intelligence_dict}.
    """
    ids = list({int(pid) for pid in product_ids if pid is not None})
    empty = {
        "suggested_quantity": 100,
        "best_supplier": None,
        "usual_supplier": None,
        "alternative_supplier": None,
        "reason": _reason_for_reorder(None, None),
    }
    if include_comparison:
        empty["comparison"] = None
    if not ids:
        return {}

    qty_map = bulk_suggested_order_quantities(ids, branch_id)

    intake_rows = (
        StockIntake.objects.filter(product_id__in=ids)
        .values(
            "product_id",
            "supplier_id",
            "supplier__name",
            "unit_cost",
            "received_date",
        )
        .order_by("-received_date")
    )

    # product -> supplier_id -> stats (first sighting = latest price)
    by_product = {pid: {} for pid in ids}
    usual = {}
    for r in intake_rows:
        pid = r["product_id"]
        sid = r["supplier_id"]
        if pid not in by_product or sid is None:
            continue
        if pid not in usual:
            usual[pid] = {
                "supplier_id": sid,
                "supplier_name": r["supplier__name"] or "Unknown",
                "last_price": float(r["unit_cost"] or 0),
                "last_date": r["received_date"].date().isoformat()
                if r["received_date"]
                else None,
            }
        suppliers = by_product[pid]
        if sid not in suppliers:
            suppliers[sid] = {
                "supplier_id": sid,
                "supplier_name": r["supplier__name"] or "Unknown",
                "last_price": float(r["unit_cost"] or 0),
                "prices": [float(r["unit_cost"] or 0)],
                "times_supplied": 1,
            }
        else:
            suppliers[sid]["times_supplied"] += 1
            suppliers[sid]["prices"].append(float(r["unit_cost"] or 0))

    result = {}
    for pid in ids:
        suppliers = by_product.get(pid) or {}
        ranked = []
        for row in suppliers.values():
            prices = row["prices"]
            last_price = prices[0]
            avg_price = sum(prices) / len(prices)
            ranked.append(
                {
                    "supplier_id": row["supplier_id"],
                    "supplier_name": row["supplier_name"],
                    "last_price": round(last_price, 2),
                    "average_price": round(avg_price, 2),
                    "times_supplied": row["times_supplied"],
                    "trend": _price_trend(last_price, avg_price),
                    "is_cheapest": False,
                    "savings_vs_expensive": 0,
                }
            )
        ranked.sort(key=lambda x: x["last_price"])
        if ranked:
            min_p = ranked[0]["last_price"]
            max_p = ranked[-1]["last_price"]
            for row in ranked:
                row["is_cheapest"] = row["last_price"] == min_p
                row["savings_vs_expensive"] = round(max_p - row["last_price"], 2)

        cheapest = ranked[0] if ranked else None
        alt = ranked[1] if len(ranked) > 1 else None
        usual_supplier = usual.get(pid)
        recommended = cheapest
        if not recommended and usual_supplier:
            recommended = {
                "supplier_id": usual_supplier["supplier_id"],
                "supplier_name": usual_supplier["supplier_name"],
                "last_price": usual_supplier["last_price"],
                "average_price": usual_supplier["last_price"],
                "times_supplied": 1,
                "trend": "STABLE",
                "is_cheapest": True,
                "savings_vs_expensive": 0,
            }

        intel = {
            "suggested_quantity": qty_map.get(pid, 100),
            "best_supplier": recommended,
            "usual_supplier": usual_supplier,
            "alternative_supplier": alt,
            "reason": _reason_for_reorder(cheapest, usual_supplier),
        }
        if include_comparison:
            intel["comparison"] = {
                "product": {"id": pid, "name": None},
                "comparison": ranked,
                "cheapest_supplier": cheapest["supplier_name"] if cheapest else None,
                "most_expensive_supplier": ranked[-1]["supplier_name"] if ranked else None,
            }
        result[pid] = intel
    return result


def low_stock_reorder_suggestion(product_id, branch_id, include_comparison=True):
    """Single-product wrapper used by detail-style callers."""
    data = bulk_reorder_intelligence(
        [product_id], branch_id, include_comparison=include_comparison
    )
    return data.get(product_id) or {
        "suggested_quantity": 100,
        "best_supplier": None,
        "usual_supplier": None,
        "alternative_supplier": None,
        "reason": _reason_for_reorder(None, None),
        "comparison": None,
    }


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
    Aggregate supplier spend / savings from Stock received history.

    Uses a few bulk queries (not per-product loops) so ~1k intakes stay
    well under Render request timeouts.
    """
    from django.db.models.functions import TruncMonth

    twelve_months_ago = timezone.now() - timedelta(days=365)
    three_months_ago = timezone.now() - timedelta(days=90)
    intakes = StockIntake.objects.filter(received_date__gte=twelve_months_ago)

    spending_by_supplier = list(
        intakes.values("supplier_id", "supplier__name")
        .annotate(total_spent=Sum("total_cost"), order_count=Count("id"))
        .order_by("-total_spent")
    )
    total_spend = sum(float(s["total_spent"] or 0) for s in spending_by_supplier)

    for row in spending_by_supplier:
        row["total_spent"] = float(row["total_spent"] or 0)
        row["supplier_name"] = row.pop("supplier__name", None) or "Unknown"
        row["pct_of_total"] = (
            round(row["total_spent"] / total_spend * 100, 1) if total_spend else 0
        )

    monthly_qs = (
        intakes.annotate(month=TruncMonth("received_date"))
        .values("month")
        .annotate(avg_price=Avg("unit_cost"))
        .order_by("month")
    )
    price_trend = []
    for row in monthly_qs:
        month = row["month"]
        if not month:
            continue
        price_trend.append(
            {
                "month": month.strftime("%Y-%m"),
                "avg_price": round(float(row["avg_price"] or 0), 2),
            }
        )

    # One pass over intake rows: last price + times supplied per product/supplier
    intake_rows = intakes.values(
        "product_id",
        "product__name",
        "supplier_id",
        "supplier__name",
        "unit_cost",
        "received_date",
    ).order_by("-received_date")

    # product_id -> {supplier_id: {name, last_price, times}}
    by_product = {}
    product_names = {}
    for r in intake_rows:
        pid = r["product_id"]
        sid = r["supplier_id"]
        if pid is None or sid is None:
            continue
        product_names[pid] = r["product__name"] or f"Product #{pid}"
        suppliers = by_product.setdefault(pid, {})
        if sid not in suppliers:
            suppliers[sid] = {
                "supplier_id": sid,
                "supplier_name": r["supplier__name"] or "Unknown",
                "last_price": float(r["unit_cost"] or 0),
                "times_supplied": 1,
            }
        else:
            suppliers[sid]["times_supplied"] += 1

    usage_map = {}
    if by_product:
        usage_map = {
            row["product_id"]: float(row["t"] or 0)
            for row in DispensationItem.objects.filter(
                dispensation__dispensed_at__gte=three_months_ago,
                product_id__in=list(by_product.keys()),
            )
            .values("product_id")
            .annotate(t=Sum("quantity"))
        }

    savings_rows = []
    supplier_sole_counts = {}
    for pid, suppliers in by_product.items():
        ranked = sorted(suppliers.values(), key=lambda x: x["last_price"])
        if len(ranked) == 1:
            sid = ranked[0]["supplier_id"]
            supplier_sole_counts[sid] = supplier_sole_counts.get(sid, 0) + 1
            continue
        if len(ranked) < 2:
            continue
        cheapest = ranked[0]
        current = max(ranked, key=lambda x: x["times_supplied"])
        if cheapest["supplier_id"] == current["supplier_id"]:
            continue
        monthly_usage = usage_map.get(pid, 0.0) / 3.0
        monthly_saving = (current["last_price"] - cheapest["last_price"]) * monthly_usage
        savings_rows.append(
            {
                "product_id": pid,
                "product_name": product_names.get(pid, f"Product #{pid}"),
                "current_supplier": current["supplier_name"],
                "current_price": current["last_price"],
                "cheapest_supplier": cheapest["supplier_name"],
                "cheapest_price": cheapest["last_price"],
                "monthly_usage": round(monthly_usage, 1),
                "monthly_saving": round(monthly_saving, 2),
                "annual_saving": round(monthly_saving * 12, 2),
            }
        )

    savings_rows.sort(key=lambda x: x["annual_saving"], reverse=True)
    # Keep response light for the UI
    savings_rows = savings_rows[:50]
    total_annual = sum(r["annual_saving"] for r in savings_rows)

    total_unique = len(by_product) or 1
    supplier_names = {
        s["supplier_id"]: s["supplier_name"] for s in spending_by_supplier
    }
    dependency_alerts = []
    for sid, count in supplier_sole_counts.items():
        pct = count / total_unique * 100
        if pct > 40:
            dependency_alerts.append(
                {
                    "supplier_id": sid,
                    "supplier_name": supplier_names.get(sid) or f"Supplier #{sid}",
                    "pct": round(pct, 1),
                }
            )

    return {
        "spending_by_supplier": spending_by_supplier,
        "price_trend": price_trend,
        "potential_savings": savings_rows,
        "total_annual_savings": round(total_annual, 2),
        "dependency_alerts": dependency_alerts,
    }
