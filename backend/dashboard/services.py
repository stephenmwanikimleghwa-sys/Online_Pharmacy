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
        today_disp_qs = dispensations.filter(dispensed_at__date=today)
        
        from orders.models import Order
        orders = Order.objects.filter(branch=branch)
        today_orders_qs = orders.filter(created_at__date=today)
        
        sales_count = today_disp_qs.count() + today_orders_qs.count()
        
        disp_rev = today_disp_qs.aggregate(total=Sum("total_amount"))["total"] or 0
        order_rev = today_orders_qs.aggregate(total=Sum("total_amount"))["total"] or 0
        revenue = disp_rev + order_rev
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

    from users.models import User
    from datetime import timedelta
    active_users = []
    threshold = timezone.now() - timedelta(minutes=15)
    for u in User.objects.filter(is_active=True, last_activity__gte=threshold).select_related('branch'):
        active_users.append({
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "branch": u.branch.name if u.branch else None,
            "last_activity": u.last_activity.isoformat() if u.last_activity else None,
        })

    return {
        "branches": branches,
        "active_users": active_users,
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
    
    # Fetch from Dispensations
    for sale in (
        Dispensation.objects.filter(branch=branch)
        .select_related("dispensed_by")
        .order_by("-dispensed_at")[:5]
    ):
        recent_transactions.append(
            {
                "id": f"D-{sale.id}",
                "sale_type": sale.sale_type,
                "total_amount": float(sale.total_amount),
                "payment_mode": sale.payment_mode,
                "dispensed_at": sale.dispensed_at,
                "dispensed_by": sale.dispensed_by.username if sale.dispensed_by else None,
            }
        )

    # Fetch from Orders
    from orders.models import Order
    for order in (
        Order.objects.filter(branch=branch)
        .select_related("user", "payment")
        .order_by("-created_at")[:5]
    ):
        recent_transactions.append(
            {
                "id": f"O-{order.id}",
                "sale_type": "otc",
                "total_amount": float(order.total_amount),
                "payment_mode": order.payment.payment_method if hasattr(order, 'payment') and order.payment else "cash",
                "dispensed_at": order.created_at,
                "dispensed_by": order.user.username if order.user else None,
            }
        )
        
    # Sort merged transactions and take top 5
    recent_transactions.sort(key=lambda x: x["dispensed_at"], reverse=True)
    recent_transactions = recent_transactions[:5]
    
    # Format dates
    for tx in recent_transactions:
        tx["dispensed_at"] = tx["dispensed_at"].isoformat()

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
