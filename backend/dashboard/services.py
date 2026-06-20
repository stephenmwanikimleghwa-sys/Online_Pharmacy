"""
Dashboard aggregation helpers.
"""
from datetime import timedelta

from django.db.models import Count, F, Q, Sum
from django.utils import timezone

from inventory.models import Dispensation, InterBranchTransfer
from orders.models import Order
from products.models import BranchStock, Product
from users.branch_auth import get_allowed_branches
from users.models import Branch, User


def _branches_for_admin(user):
    if user.is_superuser:
        return Branch.objects.filter(is_active=True).select_related("pharmacy")
    if user.pharmacy_id:
        return get_allowed_branches(user)
    return Branch.objects.filter(is_active=True).select_related("pharmacy")


def build_global_overview(user):
    today = timezone.now().date()
    branches_qs = list(_branches_for_admin(user))
    branch_ids = [b.id for b in branches_qs]

    # Single bulk query: today's dispensation count + revenue per branch
    disp_map = {
        d['branch_id']: d
        for d in Dispensation.objects
        .filter(branch_id__in=branch_ids, dispensed_at__date=today)
        .values('branch_id')
        .annotate(count=Count('id'), revenue=Sum('total_amount'))
    }

    # Single bulk query: today's order count + revenue per branch
    order_map = {
        o['branch_id']: o
        for o in Order.objects
        .filter(branch_id__in=branch_ids, created_at__date=today)
        .values('branch_id')
        .annotate(count=Count('id'), revenue=Sum('total_amount'))
    }

    # Single bulk query: low stock count per branch
    low_stock_map = {
        ls['branch_id']: ls['count']
        for ls in BranchStock.objects
        .filter(branch_id__in=branch_ids, quantity__lte=F('reorder_level'), quantity__gt=0)
        .values('branch_id')
        .annotate(count=Count('id'))
    }

    # Single bulk query: products-in-stock count per branch
    products_map = {
        p['branch_id']: p['count']
        for p in BranchStock.objects
        .filter(branch_id__in=branch_ids, quantity__gt=0)
        .values('branch_id')
        .annotate(count=Count('id'))
    }

    branches = []
    total_revenue = 0.0
    total_sales = 0
    total_low_stock = 0

    for branch in branches_qs:
        bid = branch.id
        d = disp_map.get(bid, {})
        o = order_map.get(bid, {})
        sales_count = (d.get('count') or 0) + (o.get('count') or 0)
        revenue_f = float(d.get('revenue') or 0) + float(o.get('revenue') or 0)
        low_stock = low_stock_map.get(bid, 0)
        products_count = products_map.get(bid, 0)

        branches.append({
            "id": bid,
            "name": branch.name,
            "type": branch.branch_type,
            "products_count": products_count,
            "low_stock_count": low_stock,
            "today_sales_count": sales_count,
            "today_revenue": revenue_f,
        })
        total_revenue += revenue_f
        total_sales += sales_count
        total_low_stock += low_stock

    # Single query for recently active users
    threshold = timezone.now() - timedelta(minutes=15)
    active_users = [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "branch": u.branch.name if u.branch else None,
            "last_activity": u.last_activity.isoformat() if u.last_activity else None,
        }
        for u in User.objects
        .filter(is_active=True, last_activity__gte=threshold)
        .select_related('branch')
    ]

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
    expiry_summary = {"expired": 0, "critical": 0, "warning": 0, "caution": 0}
    try:
        from inventory.services.expiry import get_expiry_summary, get_expiry_batches

        expiry_summary = get_expiry_summary(branch.id)
        for row in get_expiry_batches(branch.id)[:30]:
            if row["status"] in ("EXPIRED", "CRITICAL", "WARNING"):
                expiry_items.append(
                    {
                        "batch_id": row["id"],
                        "product_id": row["product_id"],
                        "product_name": row["product_name"],
                        "expiry_date": row["expiry_date"],
                        "days_left": row["days_left"],
                        "status": row["status"],
                        "quantity": row["quantity_remaining"],
                    }
                )
    except Exception:
        pass

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
        .select_related(
            "product",
            "source_branch",
            "destination_branch",
            "requested_by",
        )
        .order_by("-created_at")[:10]
    ):
        pending_transfers.append(
            {
                "id": transfer.id,
                "product_name": transfer.product.name,
                "quantity": transfer.quantity,
                "source_branch": transfer.source_branch.name,
                "destination_branch": transfer.destination_branch.name,
                "requested_by": (
                    transfer.requested_by.get_full_name()
                    or transfer.requested_by.username
                    if transfer.requested_by
                    else None
                ),
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
        "expiry_summary": expiry_summary,
        "recent_transactions": recent_transactions,
        "pending_transfers": pending_transfers,
        "pending_transfers_count": len(pending_transfers),
    }
