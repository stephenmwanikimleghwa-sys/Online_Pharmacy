from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count
from django.db import models
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin
from products.models import Product
from products.models import StockLog
from users.models import User


from products.serializers import ProductSerializer
from .serializers import StockLogSerializer


@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def inventory_summary(request):
    """
    Get inventory summary for pharmacist dashboard.
    Returns total products, low stock items, and out of stock items.
    """
    total_products = Product.objects.filter(is_active=True).count()
    low_stock_items = Product.objects.filter(
        is_active=True,
        stock_quantity__lte=models.F("reorder_threshold"),
        stock_quantity__gt=0,
    ).count()
    out_of_stock_items = Product.objects.filter(
        is_active=True, stock_quantity=0
    ).count()

    return Response(
        {
            "totalProducts": total_products,
            "lowStockItems": low_stock_items,
            "outOfStockItems": out_of_stock_items,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])  # Add basic authentication requirement
def inventory_list(request):
    """
    List all inventory items with search, filtering and pagination.
    Supported query params:
    - search: Search in name, category, supplier
    - low_stock: true/false
    - out_of_stock: true/false
    - category: Filter by category
    - expiry_status: expired/expiring_soon/near_expiry/valid
    - sort_by: name/expiry/stock/price
    - sort_order: asc/desc
    - page: Page number
    - per_page: Items per page
    """
    # Debug authentication and permissions
    print("[Debug] Inventory List Request:")
    print(f"  User: {request.user.username}")
    print(f"  User ID: {request.user.id}")
    print(f"  Is Authenticated: {request.user.is_authenticated}")
    print(f"  Is Staff: {request.user.is_staff}")
    print(f"  Groups: {[g.name for g in request.user.groups.all()]}")
    print(f"  Is Pharmacist: {hasattr(request.user, 'is_pharmacist') and request.user.is_pharmacist}")
    print(f"  Is Admin: {hasattr(request.user, 'is_admin') and request.user.is_admin}")
    
    # Check if user has required permissions
    if not (request.user.is_staff or 
            (hasattr(request.user, 'is_pharmacist') and request.user.is_pharmacist) or
            (hasattr(request.user, 'is_admin') and request.user.is_admin)):
        print("[Debug] Permission denied: User lacks required role")
        return Response(
            {"detail": "You do not have permission to view inventory."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    from django.utils import timezone
    today = timezone.now().date()
    
    products = Product.objects.filter(is_active=True)
    
    # Search functionality
    search = request.GET.get("search", "").strip()
    if search:
        products = products.filter(
            Q(name__icontains=search) |
            Q(category__icontains=search) |
            Q(supplier__icontains=search)
        )

    # Filter by category
    category = request.GET.get("category")
    if category:
        products = products.filter(category=category)

    # Filter by stock status
    low_stock = request.GET.get("low_stock")
    if low_stock == "true":
        products = products.filter(
            stock_quantity__lte=models.F("reorder_threshold"), stock_quantity__gt=0
        )

    out_of_stock = request.GET.get("out_of_stock")
    if out_of_stock == "true":
        products = products.filter(stock_quantity=0)
        
    # Filter by expiry status
    expiry_status = request.GET.get("expiry_status")
    if expiry_status:
        if expiry_status == "expired":
            products = products.filter(expiry_date__lt=today)
        elif expiry_status == "expiring_soon":
            products = products.filter(
                expiry_date__gte=today,
                expiry_date__lte=today + timezone.timedelta(days=30)
            )
        elif expiry_status == "near_expiry":
            products = products.filter(
                expiry_date__gte=today + timezone.timedelta(days=31),
                expiry_date__lte=today + timezone.timedelta(days=90)
            )
        elif expiry_status == "valid":
            products = products.filter(
                expiry_date__gt=today + timezone.timedelta(days=90)
            )
            
    # Sorting
    sort_by = request.GET.get("sort_by", "name")
    sort_order = request.GET.get("sort_order", "asc")
    
    sort_field = {
        "name": "name",
        "expiry": "expiry_date",
        "stock": "stock_quantity",
        "price": "price"
    }.get(sort_by, "name")
    
    if sort_order == "desc":
        sort_field = f"-{sort_field}"
        
    products = products.order_by(sort_field)

    # Pagination (optional)
    page = request.GET.get("page", 1)
    per_page = request.GET.get("per_page", 20)
    paginator = Paginator(products, per_page)

    try:
        products_page = paginator.page(page)
    except PageNotAnInteger:
        products_page = paginator.page(1)
    except EmptyPage:
        products_page = paginator.page(paginator.num_pages)

    products_list = ProductSerializer(products_page, many=True).data
    # Debug response data
    print("[Debug] Inventory Response:")
    print(f"  Total Items: {paginator.count}")
    print(f"  Current Page: {page}")
    print(f"  Items on Page: {len(products_list)}")
    print(f"  Sample Items: {[{'id': p['id'], 'name': p['name']} for p in products_list[:2]]}")
    
    return Response(
        {
            "products": products_list or [],  # Ensure we always return a list
            "totalPages": paginator.num_pages,
            "currentPage": int(page),
            "totalItems": paginator.count,
            "debug": {
                "user": request.user.username,
                "isPharmacist": hasattr(request.user, 'is_pharmacist') and request.user.is_pharmacist,
                "isAdmin": hasattr(request.user, 'is_admin') and request.user.is_admin,
                "groups": [g.name for g in request.user.groups.all()],
            }
        }
    )


@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def low_stock_items(request):
    """
    Get list of low stock items.
    """
    products = Product.objects.filter(
        is_active=True,
        stock_quantity__lte=models.F("reorder_threshold"),
        stock_quantity__gt=0,
    ).order_by("stock_quantity")

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def out_of_stock_items(request):
    """
    Get list of out of stock items.
    """
    products = Product.objects.filter(is_active=True, stock_quantity=0).order_by("name")

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def inventory_detail(request, pk):
    """
    Get detailed information about a specific inventory item.
    """
    product = get_object_or_404(Product, pk=pk, is_active=True)
    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def restock_inventory(request, pk):
    """
    Restock an inventory item.
    """
    product = get_object_or_404(Product, pk=pk)
    quantity = request.data.get("quantity")
    reason = request.data.get("reason", "Restock")

    if not quantity or quantity <= 0:
        return Response(
            {"error": "Quantity must be a positive number."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update stock quantity
    previous_quantity = product.stock_quantity
    product.stock_quantity += quantity
    product.save()

    # Create stock log
    StockLog.objects.create(
        product=product,
        previous_quantity=previous_quantity,
        new_quantity=product.stock_quantity,
        change_amount=quantity,
        change_type="restock",
        reason=reason,
        logged_by=request.user,
    )

    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def adjust_inventory(request, pk):
    """
    Adjust an inventory item's stock by positive or negative amount.
    Expects: { "quantity": int, "reason": str, "change_type": "adjustment" }
    """
    product = get_object_or_404(Product, pk=pk)
    quantity = request.data.get("quantity")
    reason = request.data.get("reason", "Adjustment")
    change_type = request.data.get("change_type", "adjustment")

    try:
        quantity = int(quantity)
    except Exception:
        return Response({"error": "Quantity must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

    if quantity == 0:
        return Response({"error": "Quantity must be non-zero for adjustment."}, status=status.HTTP_400_BAD_REQUEST)

    previous_quantity = product.stock_quantity
    new_quantity = previous_quantity + quantity
    if new_quantity < 0:
        return Response({"error": "Quantity adjustment would result in negative stock."}, status=status.HTTP_400_BAD_REQUEST)

    product.stock_quantity = new_quantity
    product.save()

    # Log the change (quantity positive for increase, negative for decrease)
    StockLog.objects.create(
        product=product,
        previous_quantity=previous_quantity,
        new_quantity=new_quantity,
        change_amount=quantity,
        change_type=change_type if change_type in dict(StockLog.CHANGE_TYPES) else "adjustment",
        reason=reason,
        logged_by=request.user,
    )

    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def stock_logs(request, pk):
    """
    Get stock logs for a specific product.
    """
    product = get_object_or_404(Product, pk=pk)
    logs = StockLog.objects.filter(product=product).order_by("-timestamp")
    serializer = StockLogSerializer(logs, many=True)
    return Response(serializer.data)
