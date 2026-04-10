from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count
from django.db import models
from django.db.models import Min
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin, IsAuditorOrAdmin
from products.models import Product, StockLog
from products.serializers import ProductSerializer
from ..serializers import StockLogSerializer

@api_view(["GET"])
@permission_classes([IsAuditorOrAdmin])
def inventory_summary(request):
    """Get inventory summary for pharmacist dashboard."""
    # Filter by pharmacy
    products = Product.objects.filter(is_active=True)
    if hasattr(request.user, 'pharmacy') and request.user.pharmacy:
        products = products.filter(pharmacy=request.user.pharmacy)

    total_products = products.count()
    low_stock_items = products.filter(
        stock_quantity__lte=models.F("reorder_threshold"),
        stock_quantity__gt=0,
    ).count()
    out_of_stock_items = products.filter(
        stock_quantity=0
    ).count()

    return Response({
        "totalProducts": total_products,
        "lowStockItems": low_stock_items,
        "outOfStockItems": out_of_stock_items,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])  # Allow all authenticated users to view inventory
def inventory_list(request):
    """List all inventory items with search, filtering and pagination."""
    try:
        products = (
            Product.objects.filter(is_active=True)
            .annotate(next_batch_expiry=Min("batches__expiry_date"))
            .order_by("name")
        )

        if hasattr(request.user, "pharmacy") and request.user.pharmacy:
            products = products.filter(pharmacy=request.user.pharmacy)

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

        low_stock = request.GET.get("low_stock")
        if low_stock == "true":
            products = products.filter(
                stock_quantity__lte=models.F("reorder_threshold"),
                stock_quantity__gt=0,
            )

        out_of_stock = request.GET.get("out_of_stock")
        if out_of_stock == "true":
            products = products.filter(stock_quantity=0)

        # Pagination
        page = request.GET.get("page", 1)
        per_page = int(request.GET.get("per_page", 20))
        paginator = Paginator(products, per_page)

        try:
            products_page = paginator.page(page)
        except PageNotAnInteger:
            products_page = paginator.page(1)
        except EmptyPage:
            products_page = paginator.page(paginator.num_pages)

        # Serialize and prepare response
        serialized_products = ProductSerializer(products_page, many=True).data
        
        # Add computed fields that we use in the frontend
        for product in serialized_products:
            product['is_low_stock'] = product['stock_quantity'] <= product.get('reorder_threshold', 10)
            product['in_stock'] = product['stock_quantity'] > 0

        # If Product.expiry_date is missing, use the earliest Batch expiry date.
        # Also back-fill expiry_status + days_until_expiry for the UI.
        # Note: serializer properties use Product.expiry_date, so we compute here.
        today = timezone.now().date()
        next_expiry_by_id = {
            p.id: getattr(p, "next_batch_expiry", None) for p in products_page
        }
        for product in serialized_products:
            if product.get("expiry_date"):
                continue
            next_expiry = next_expiry_by_id.get(product.get("id"))
            if not next_expiry:
                continue
            product["expiry_date"] = str(next_expiry)
            days = (next_expiry - today).days
            product["days_until_expiry"] = days
            if days < 0:
                product["expiry_status"] = "expired"
            elif days <= 30:
                product["expiry_status"] = "expiring_soon"
            elif days <= 90:
                product["expiry_status"] = "near_expiry"
            else:
                product["expiry_status"] = "valid"
        
        response_data = {
            "products": serialized_products,
            "totalPages": paginator.num_pages,
            "currentPage": int(page),
            "totalItems": paginator.count,
        }

        return Response(response_data)

    except Exception as e:
        return Response(
            {
                "error": "Failed to fetch inventory",
                "detail": str(e),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(["GET"])
@permission_classes([IsAuditorOrAdmin])
def low_stock_items(request):
    """Get list of low stock items."""
    products = Product.objects.filter(
        is_active=True,
        stock_quantity__lte=models.F("reorder_threshold"),
        stock_quantity__gt=0,
    )
    
    if hasattr(request.user, 'pharmacy') and request.user.pharmacy:
        products = products.filter(pharmacy=request.user.pharmacy)
        
    products = products.order_by("stock_quantity")

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuditorOrAdmin])
def out_of_stock_items(request):
    """Get list of out of stock items."""
    products = Product.objects.filter(
        is_active=True,
        stock_quantity=0
    )
    
    if hasattr(request.user, 'pharmacy') and request.user.pharmacy:
        products = products.filter(pharmacy=request.user.pharmacy)
        
    products = products.order_by("name")

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuditorOrAdmin])
def inventory_detail(request, pk):
    """Get detailed information about a specific inventory item."""
    product = get_object_or_404(Product, pk=pk, is_active=True)
    serializer = ProductSerializer(product)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def restock_inventory(request, pk):
    """Restock an inventory item."""
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
    """Adjust an inventory item's stock by positive or negative amount."""
    product = get_object_or_404(Product, pk=pk)
    quantity = request.data.get("quantity")
    reason = request.data.get("reason", "Adjustment")
    change_type = request.data.get("change_type", "adjustment")

    try:
        quantity = int(quantity)
    except Exception:
        return Response(
            {"error": "Quantity must be an integer."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if quantity == 0:
        return Response(
            {"error": "Quantity must be non-zero for adjustment."},
            status=status.HTTP_400_BAD_REQUEST
        )

    previous_quantity = product.stock_quantity
    new_quantity = previous_quantity + quantity
    if new_quantity < 0:
        return Response(
            {"error": "Quantity adjustment would result in negative stock."},
            status=status.HTTP_400_BAD_REQUEST
        )

    product.stock_quantity = new_quantity
    product.save()

    # Log the change
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
@permission_classes([IsAuditorOrAdmin])
def stock_logs(request, pk):
    """Get stock logs for a specific product."""
    product = get_object_or_404(Product, pk=pk)
    logs = StockLog.objects.filter(product=product).order_by("-timestamp")
    serializer = StockLogSerializer(logs, many=True)
    return Response(serializer.data)