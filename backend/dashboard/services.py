"""
Dashboard aggregation helpers.
"""
from datetime import timedelta

from django.db.models import F, Q, Sum
from django.utils import timezone

from inventory.models import Dispensation, InterBranchTransfer
from products.models import BranchStock, Product
from users.branch_auth import get_allowed_branches
from users.models import Branch


def _branches_for_admin(user):
    if user.is_superuser:
        return Branch.objects.filter(is_active=True).select_related("pharmacy")
    if user.pharmacy_id:
        return get_allowed_branches(user)
    return Branch.objects.filter(is_active=True).select_related("pharmacy")


def build_global_overview(user):
    today = timezone.now().date()
    branches = []
    total_revenue = 0.0
    total_sales = 0
    total_low_stock = 0

    for branch in _branches_for_admin(user):
        dispensations = Dispensation.objects.filter(branch=branch)
        today_qs = dispensations.filter(dispensed_at__date=today)
        sales_count = today_qs.count()
        revenue = today_qs.aggregate(total=Sum("total_amount"))["total"] or 0
        low_stock = BranchStock.objects.filter(
            branch=branch,
            quantity__lte=F("reorder_level"),
            quantity__gt=0,
        ).count()
        products_count = BranchStock.objects.filter(branch=branch, quantity__gt=0).count()

        revenue_f = float(revenue)
        branches.append(
            {
                "id": branch.id,
                "name": branch.name,
                "type": branch.branch_type,
                "products_count": products_count,
                "low_stock_count": low_stock,
                "today_sales_count": sales_count,
                "today_revenue": revenue_f,
            }
        )
        total_revenue += revenue_f
        total_sales += sales_count
        total_low_stock += low_stock

    return {
        "branches": branches,
        "totals": {
            "total_revenue_today": total_revenue,
            "total_sales_today": total_sales,
            "total_low_stock": total_low_stock,
        },
    }


def build_branch_operations(branch):
    """Operational snapshot scoped to one active branch."""
    today = timezone.now().date()
    sixty_days = today + timedelta(days=60)

    low_stock_items = []
    for bs in (
        BranchStock.objects.filter(
            branch=branch,
            quantity__lte=F("reorder_level"),
            quantity__gt=0,
        )
        .select_related("product")
        .order_by("quantity")[:20]
    ):
        low_stock_items.append(
            {
                "product_id": bs.product_id,
                "product_name": bs.product.name,
                "quantity": float(bs.quantity),
                "reorder_level": float(bs.reorder_level),
            }
        )

    expiry_items = []
    for product in (
        Product.objects.filter(
            expiry_date__lte=sixty_days,
            expiry_date__gte=today,
            branch_stocks__branch=branch,
            branch_stocks__quantity__gt=0,
        )
        .distinct()
        .order_by("expiry_date")[:20]
    ):
        expiry_items.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "expiry_date": product.expiry_date.isoformat() if product.expiry_date else None,
            }
        )

    recent_transactions = []
    for sale in (
        Dispensation.objects.filter(branch=branch)
        .select_related("dispensed_by")
        .order_by("-dispensed_at")[:5]
    ):
        recent_transactions.append(
            {
                "id": sale.id,
                "sale_type": sale.sale_type,
                "total_amount": float(sale.total_amount),
                "payment_mode": sale.payment_mode,
                "dispensed_at": sale.dispensed_at.isoformat(),
                "dispensed_by": sale.dispensed_by.username if sale.dispensed_by else None,
            }
        )

    pending_transfers = []
    for transfer in (
        InterBranchTransfer.objects.filter(status="pending")
        .filter(Q(source_branch=branch) | Q(destination_branch=branch))
        .select_related("product", "source_branch", "destination_branch")
        .order_by("-created_at")[:10]
    ):
        pending_transfers.append(
            {
                "id": transfer.id,
                "product_name": transfer.product.name,
                "quantity": transfer.quantity,
                "source_branch": transfer.source_branch.name,
                "destination_branch": transfer.destination_branch.name,
                "status": transfer.status,
                "created_at": transfer.created_at.isoformat(),
            }
        )

    return {
        "branch": {"id": branch.id, "name": branch.name, "type": branch.branch_type},
        "low_stock_alerts": low_stock_items,
        "low_stock_count": len(low_stock_items),
        "expiry_alerts": expiry_items,
        "expiry_count": len(expiry_items),
        "recent_transactions": recent_transactions,
        "pending_transfers": pending_transfers,
        "pending_transfers_count": len(pending_transfers),
    }
