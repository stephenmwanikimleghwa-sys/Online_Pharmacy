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
from users.models import Branch, User, StaffActivityLog


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
        .annotate(count=Count('id'), revenue=Sum('total_amount'), discounts=Sum('discount'))
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
    total_discounts = 0.0
    total_sales = 0
    total_low_stock = 0

    for branch in branches_qs:
        bid = branch.id
        d = disp_map.get(bid, {})
        o = order_map.get(bid, {})
        sales_count = (d.get('count') or 0) + (o.get('count') or 0)
        revenue_f = float(d.get('revenue') or 0) + float(o.get('revenue') or 0)
        discounts_f = float(d.get('discounts') or 0)
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
        total_discounts += discounts_f
        total_sales += sales_count
        total_low_stock += low_stock

    # Session tracking for today
    today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
    logs = StaffActivityLog.objects.filter(
        timestamp__gte=today_start,
        event_type__in=['LOGIN', 'LOGOUT']
    ).select_related('user', 'user__branch').order_by('timestamp')

    user_sessions_map = {}
    for log in logs:
        if not log.user:
            continue
        uid = log.user.id
        if uid not in user_sessions_map:
            user_sessions_map[uid] = {
                "id": uid,
                "username": log.user.username,
                "role": log.user.role,
                "branch": log.user.branch.name if log.user.branch else None,
                "login_time": None,
                "logout_time": None,
                "duration_minutes": 0,
                "is_active": False,
                "last_activity": log.user.last_activity,
            }
        
        session = user_sessions_map[uid]
        if log.event_type == 'LOGIN':
            session['login_time'] = log.timestamp
            session['logout_time'] = None
            session['is_active'] = True
        elif log.event_type == 'LOGOUT':
            if session['login_time']:
                diff = log.timestamp - session['login_time']
                session['duration_minutes'] += int(diff.total_seconds() / 60)
            session['logout_time'] = log.timestamp
            session['is_active'] = False

    # For users who never logged out, calculate duration up to now (or their last activity)
    now = timezone.now()
    active_threshold = now - timedelta(minutes=15)
    
    for uid, session in user_sessions_map.items():
        if session['is_active'] and session['login_time']:
            # If their last API call was > 15 mins ago, consider them implicitly logged out
            if session['last_activity'] and session['last_activity'] < active_threshold:
                session['is_active'] = False
                session['logout_time'] = session['last_activity']
                diff = session['logout_time'] - session['login_time']
                session['duration_minutes'] += int(max(0, diff.total_seconds() / 60))
            else:
                diff = now - session['login_time']
                session['duration_minutes'] += int(diff.total_seconds() / 60)
                
        # Format times for JSON
        session['login_time'] = session['login_time'].isoformat() if session['login_time'] else None
        session['logout_time'] = session['logout_time'].isoformat() if session['logout_time'] else None
        # Remove last_activity to keep payload clean
        session.pop('last_activity', None)

    # Convert map to list, sort by is_active (True first), then duration
    user_sessions_today = sorted(
        user_sessions_map.values(), 
        key=lambda x: (-int(x['is_active']), -x['duration_minutes'])
    )

    return {
        "branches": branches,
        "active_users": user_sessions_today, # Kept same key for backward compatibility, but data is richer
        "totals": {
            "total_revenue_today": total_revenue,
            "total_discounts_today": total_discounts,
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
