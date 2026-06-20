from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count, F, Min, Sum
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin, IsAuditorOrAdmin
# Phase 6: Inventory management with department and branch stock filtering
from users.active_branch import get_active_branch
from products.models import Product, StockLog, BranchStock
from users.models import Branch
from products.serializers import ProductSerializer
from ..serializers import StockLogSerializer
from config.api_responses import ApiErrorCode, api_error, api_validation_error
from users.utils import log_activity
from ..models.stock_intake import StockIntake

@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def inventory_summary(request):
    """Get inventory summary for pharmacist dashboard."""
    user = request.user
    is_admin = getattr(user, 'role', None) == 'admin' or user.is_superuser
    branch_param = request.query_params.get('branch')
    
    qs = BranchStock.objects.filter(product__is_active=True)
    active = get_active_branch(request)
    if is_admin and branch_param and branch_param != 'all':
        qs = qs.filter(branch_id=branch_param)
    elif active:
        qs = qs.filter(branch=active)
    elif not is_admin and user.branch:
        qs = qs.filter(branch=user.branch)
        
    total_products = qs.values('product_id').distinct().count()
    low_stock_items = qs.filter(quantity__lte=F('reorder_level'), quantity__gt=0).count()
    out_of_stock_items = qs.filter(quantity__lte=0).count()

    return Response({
        "totalProducts": total_products,
        "lowStockItems": low_stock_items,
        "outOfStockItems": out_of_stock_items,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_list(request):
    """List all inventory items with search, filtering and pagination."""
    try:
        user = request.user
        is_admin = getattr(user, 'role', None) == 'admin' or user.is_superuser
        branch_param = request.query_params.get('branch')
        
        products = (
            Product.objects.filter(is_active=True)
            .select_related("pharmacy", "pricing_tier")
            .prefetch_related("branch_stocks__branch")
            .order_by("name")
        )

        search = request.GET.get("search", "").strip()
        if search:
            products = products.filter(
                Q(name__icontains=search) |
                Q(category__icontains=search) |
                Q(supplier__icontains=search)
            )

        category = request.GET.get("category")
        if category:
            products = products.filter(category=category)

        # No pagination for inventory management - return all products
        # When per_page is large (99999), return all results without pagination
        per_page = int(request.GET.get("per_page", 99999))
        page = request.GET.get("page", 1)
        paginator = None
        
        if per_page >= 99999:
            # Return all products without pagination
            products_page = products
            total_count = products.count()
        else:
            # Fallback to pagination if per_page is reasonable
            paginator = Paginator(products, per_page)
            try:
                products_page = paginator.page(page)
            except PageNotAnInteger:
                products_page = paginator.page(1)
            except EmptyPage:
                products_page = paginator.page(paginator.num_pages)
            total_count = paginator.count

        # Serialize
        serialized_products = ProductSerializer(products_page, many=True).data
        
        target_branch_id = None
        active_branch = get_active_branch(request)
        if is_admin and branch_param and branch_param != 'all':
            target_branch_id = int(branch_param)
        elif active_branch:
            target_branch_id = active_branch.id
        elif not is_admin and user.branch:
            target_branch_id = user.branch.id

        # Determine branch quantity - OPTIMIZED: Bulk fetch all branch stocks at once
        # Create lookup dict to avoid O(n) search
        products_by_id = {p.id: p for p in products_page}
        
        # Bulk fetch all branch stocks for these products
        all_branch_stocks = BranchStock.objects.filter(product_id__in=products_by_id.keys())
        
        # Build lookup dict: product_id -> {branch_id -> stock}
        branch_stocks_by_product = {}
        total_qty_by_product = {}
        for bs in all_branch_stocks:
            if bs.product_id not in branch_stocks_by_product:
                branch_stocks_by_product[bs.product_id] = {}
                total_qty_by_product[bs.product_id] = 0
            branch_stocks_by_product[bs.product_id][bs.branch_id] = bs
            total_qty_by_product[bs.product_id] += bs.quantity
        
        # Update serialized products with efficient lookups
        for p_data in serialized_products:
            product_id = p_data['id']
            p_obj = products_by_id[product_id]
            
            if target_branch_id:
                bs = branch_stocks_by_product.get(product_id, {}).get(target_branch_id)
                qty = bs.quantity if bs else 0
                r_lvl = bs.reorder_level if bs else p_obj.reorder_threshold
            else:
                qty = total_qty_by_product.get(product_id, 0)
                r_lvl = p_obj.reorder_threshold
                
            p_data['stock_quantity'] = float(qty)
            p_data['is_low_stock'] = float(qty) <= float(r_lvl)
            p_data['in_stock'] = float(qty) > 0

        # Filter post-serialization for low/out-of-stock if requested
        low_stock = request.GET.get("low_stock")
        if low_stock == "true":
            serialized_products = [p for p in serialized_products if p['is_low_stock'] and p['in_stock']]

        out_of_stock = request.GET.get("out_of_stock")
        if out_of_stock == "true":
            serialized_products = [p for p in serialized_products if not p['in_stock']]

        # Next expiry logic
        today = timezone.now().date()
        for product in serialized_products:
            if product.get("expiry_date"):
                expiry_str = product["expiry_date"]
                try:
                    expiry = timezone.datetime.strptime(expiry_str, "%Y-%m-%d").date()
                    days = (expiry - today).days
                    product["days_until_expiry"] = days
                    if days < 0:
                        product["expiry_status"] = "expired"
                    elif days <= 30:
                        product["expiry_status"] = "expiring_soon"
                    elif days <= 90:
                        product["expiry_status"] = "near_expiry"
                    else:
                        product["expiry_status"] = "valid"
                except Exception:
                    pass
        
        # Build response - handle both paginated and non-paginated responses
        if paginator is None:
            # Non-paginated response
            response_data = {
                "products": serialized_products,
                "totalPages": 1,
                "currentPage": 1,
                "totalItems": total_count,
            }
        else:
            # Paginated response
            response_data = {
                "products": serialized_products,
                "totalPages": paginator.num_pages,
                "currentPage": int(page),
                "totalItems": paginator.count,
            }

        return Response(response_data)

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.exception("inventory_list error: %s", str(e))
        return Response(
            {
                "success": False,
                "error": {
                    "code": "INVENTORY_ERROR",
                    "message": "Failed to fetch inventory. Please try again.",
                    "details": {"detail": str(e)},
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(["GET"])
@permission_classes([IsAuditorOrAdmin])
def low_stock_items(request):
    """Get list of low stock items."""
    from django.db.models import Prefetch
    
    user = request.user
    is_admin = getattr(user, 'role', None) == 'admin' or user.is_superuser
    branch_param = request.query_params.get('branch')

    qs = (
        BranchStock.objects
        .filter(
            product__is_active=True,
            quantity__lte=F("reorder_level"),
            quantity__gt=0
        )
        .select_related("product", "product__pharmacy", "product__pricing_tier")
        .prefetch_related("product__branch_stocks__branch")
        .order_by("quantity")
    )
    if is_admin and branch_param and branch_param != 'all':
        qs = qs.filter(branch_id=branch_param)
    elif not is_admin and user.branch:
        qs = qs.filter(branch=user.branch)
    
    data = []
    for bs in qs:
        prod_data = ProductSerializer(bs.product).data
        prod_data['stock_quantity'] = float(bs.quantity)
        data.append(prod_data)
        
    return Response(data)

@api_view(["GET"])
@permission_classes([IsAuditorOrAdmin])
def out_of_stock_items(request):
    """Get list of out of stock items."""
    user = request.user
    is_admin = getattr(user, 'role', None) == 'admin' or user.is_superuser
    branch_param = request.query_params.get('branch')

    qs = (
        BranchStock.objects
        .filter(
            product__is_active=True,
            quantity__lte=0
        )
        .select_related("product", "product__pharmacy", "product__pricing_tier")
        .prefetch_related("product__branch_stocks__branch")
        .order_by("product__name")
    )
    if is_admin and branch_param and branch_param != 'all':
        qs = qs.filter(branch_id=branch_param)
    elif not is_admin and user.branch:
        qs = qs.filter(branch=user.branch)
    
    data = []
    for bs in qs:
        prod_data = ProductSerializer(bs.product).data
        prod_data['stock_quantity'] = float(bs.quantity)
        data.append(prod_data)
        
    return Response(data)

@api_view(["GET"])
@permission_classes([IsAuditorOrAdmin])
def inventory_detail(request, pk):
    """Get detailed information about a specific inventory item."""
    product = get_object_or_404(Product, pk=pk, is_active=True)
    serializer = ProductSerializer(product)
    data = serializer.data
    
    # Append branch stock info
    branch_stocks = BranchStock.objects.filter(product=product).values('branch__name', 'quantity', 'reorder_level')
    data['branch_stocks'] = list(branch_stocks)
    
    return Response(data)

@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def restock_inventory(request, pk):
    """Restock an inventory item (manual adjustment)."""
    product = get_object_or_404(Product, pk=pk)
    quantity_raw = request.data.get("quantity")
    reason = request.data.get("reason", "Restock")
    branch_id = request.data.get("branch_id")
    supplier_id_raw = request.data.get("supplier_id")
    expiry_date_raw = request.data.get("expiry_date")

    try:
        quantity = int(quantity_raw)
    except (TypeError, ValueError, OverflowError):
        return api_validation_error("Quantity must be a whole number.")

    if quantity <= 0:
        return api_validation_error("Quantity must be at least 1.")

    branch = None
    if branch_id not in (None, ""):
        try:
            branch_id = int(branch_id)
        except (TypeError, ValueError, OverflowError):
            return api_validation_error("Please select a valid branch before adjusting stock.")

        branch = Branch.objects.filter(pk=branch_id).first()
        if not branch:
            return api_error(
                ApiErrorCode.PRODUCT_NOT_FOUND,
                "The selected branch could not be found.",
                details={"branch_id": branch_id},
            )
    else:
        branch = request.user.branch

    if not branch:
        return api_error(
            ApiErrorCode.NO_ACTIVE_BRANCH,
            "Please select which branch you are working at before adjusting stock.",
        )

    supplier = None
    if supplier_id_raw not in (None, ""):
        try:
            supplier_id = int(supplier_id_raw)
        except (TypeError, ValueError, OverflowError):
            return api_validation_error("Please select a valid supplier before adjusting stock.")
        from inventory.models.supplier import Supplier
        supplier = Supplier.objects.filter(pk=supplier_id).first()
        if not supplier:
            return api_error(
                ApiErrorCode.SUPPLIER_NOT_FOUND,
                "The selected supplier could not be found.",
                details={"supplier_id": supplier_id},
            )

    try:
        with transaction.atomic():
            expiry_date = None
            if expiry_date_raw:
                from datetime import datetime
                try:
                    expiry_date = datetime.strptime(expiry_date_raw, "%Y-%m-%d").date()
                except (TypeError, ValueError):
                    return api_validation_error("Please provide a valid expiry date.")

            if supplier is not None:
                intake = StockIntake(
                    product=product,
                    branch=branch,
                    supplier=supplier,
                    quantity_received=quantity,
                    unit_cost=0,
                    expiry_date=expiry_date,
                    received_by=request.user,
                    notes=reason,
                    payment_status='PAID'
                )
                intake._skip_credit = True
                intake.save()

                log_activity(
                    user=request.user,
                    event_type='PRODUCT_RESTOCKED',
                    branch=branch,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    details_dict={
                        'product_id': product.id,
                        'product_name': product.name,
                        'branch_name': branch.name,
                        'quantity_received': quantity,
                        'reason': reason,
                        'supplier': supplier.name,
                        'source': 'stock_intake_restock'
                    }
                )
            else:
                branch_stock, _ = BranchStock.objects.get_or_create(
                    product=product,
                    branch=branch,
                    defaults={'quantity': 0}
                )
                previous_quantity = branch_stock.quantity
                branch_stock.quantity += quantity
                branch_stock.save()

                if expiry_date and (
                    product.expiry_date is None or expiry_date < product.expiry_date
                ):
                    product.expiry_date = expiry_date
                    product.save(update_fields=['expiry_date'])

                StockLog.objects.create(
                    product=product,
                    branch=branch,
                    previous_quantity=previous_quantity,
                    new_quantity=branch_stock.quantity,
                    change_amount=quantity,
                    change_type="restock",
                    reason=reason,
                    logged_by=request.user,
                )

                log_activity(
                    user=request.user,
                    event_type='PRODUCT_RESTOCKED',
                    branch=branch,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    details_dict={
                        'product_id': product.id,
                        'product_name': product.name,
                        'branch_name': branch.name,
                        'quantity_added': quantity,
                        'reason': reason,
                        'previous_quantity': previous_quantity,
                        'new_quantity': branch_stock.quantity,
                        'source': 'manual_restock'
                    }
                )

    except Exception as e:
        import traceback
        return Response({"success": False, "error": {"code": "SYSTEM_ERROR", "message": f"Server crash: {str(e)}", "details": {"trace": traceback.format_exc()}}}, status=500)

    return Response(ProductSerializer(product, context={'request': request}).data)

@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def adjust_inventory(request, pk):
    """Adjust an inventory item's stock by positive or negative amount."""
    product = get_object_or_404(Product, pk=pk)
    quantity_raw = request.data.get("quantity")
    reason = request.data.get("reason", "Adjustment")
    change_type = request.data.get("change_type", "adjustment")
    branch_id = request.data.get("branch_id")

    try:
        quantity = int(quantity_raw)
    except (TypeError, ValueError, OverflowError):
        return api_validation_error("Quantity must be a whole number.")

    if quantity == 0:
        return api_validation_error("Quantity must be non-zero for adjustment.")

    branch = None
    if branch_id not in (None, ""):
        try:
            branch_id = int(branch_id)
        except (TypeError, ValueError, OverflowError):
            return api_validation_error("Please select a valid branch before adjusting stock.")

        from users.models import Branch
        branch = Branch.objects.filter(pk=branch_id).first()
        if not branch:
            return api_error(
                ApiErrorCode.PRODUCT_NOT_FOUND,
                "The selected branch could not be found.",
                details={"branch_id": branch_id},
            )
    else:
        branch = request.user.branch

    if not branch:
        return api_error(
            ApiErrorCode.NO_ACTIVE_BRANCH,
            "Please select which branch you are working at before adjusting stock.",
        )

    with transaction.atomic():
        branch_stock, _ = BranchStock.objects.get_or_create(
            product=product,
            branch=branch,
            defaults={'quantity': 0}
        )

        previous_quantity = branch_stock.quantity
        new_quantity = previous_quantity + quantity
        if new_quantity < 0:
            return api_error(
                ApiErrorCode.INSUFFICIENT_STOCK,
                "Quantity adjustment would result in negative stock.",
                details={
                    "available": previous_quantity,
                    "requested": abs(quantity),
                },
            )

        branch_stock.quantity = new_quantity
        branch_stock.save()

        StockLog.objects.create(
            product=product,
            branch=branch,
            previous_quantity=previous_quantity,
            new_quantity=new_quantity,
            change_amount=quantity,
            change_type=change_type,
            reason=reason,
            logged_by=request.user,
        )

    return Response(ProductSerializer(product).data)

@api_view(["GET"])
@permission_classes([IsAuditorOrAdmin])
def stock_logs(request):
    """View recent stock logs."""
    logs = StockLog.objects.select_related("product", "logged_by", "branch").all()
    
    # Filter by product if specified
    product_id = request.query_params.get("product_id")
    if product_id:
        logs = logs.filter(product_id=product_id)
        
    # Filter by user branch unless admin
    user = request.user
    is_admin = getattr(user, 'role', None) == 'admin' or user.is_superuser
    if not is_admin and user.branch:
        logs = logs.filter(branch=user.branch)
        
    logs = logs.order_by("-timestamp")[:100]
    serializer = StockLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def branch_stock_view(request):
    """
    RULE 8: branch-stock endpoint.
    - Admin: all branches side-by-side.
    - Pharmacist/Cashier: active branch only.
    """
    user = request.user
    is_admin = getattr(user, "role", None) == "admin" or user.is_superuser
    active_branch = get_active_branch(request) or getattr(user, "branch", None)

    products_qs = Product.objects.filter(is_active=True).order_by("name")
    product_id = request.query_params.get("product_id")
    if product_id:
        products_qs = products_qs.filter(id=product_id)

    if is_admin:
        branches = list(Branch.objects.filter(is_active=True).order_by("name"))
    else:
        branches = [active_branch] if active_branch else []

    bs_qs = BranchStock.objects.filter(product__in=products_qs)
    bs_map = {(bs.product_id, bs.branch_id): bs for bs in bs_qs}

    rows = []
    for product in products_qs:
        row = {
            "product_id": product.id,
            "product_name": product.name,
            "branches": [],
            "total": 0.0,
        }
        total = 0.0
        for br in branches:
            if not br:
                continue
            bs = bs_map.get((product.id, br.id))
            qty = float(bs.quantity) if bs else 0.0
            total += qty
            row["branches"].append(
                {"branch_id": br.id, "branch_name": br.name, "quantity": qty}
            )
        row["total"] = total
        rows.append(row)

    return Response({"results": rows})
