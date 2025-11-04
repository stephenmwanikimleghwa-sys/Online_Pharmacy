from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count
from django.db import models
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin
from products.models import Product, StockLog
from products.serializers import ProductSerializer
from ..serializers import StockLogSerializer
import traceback

@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def inventory_summary(request):
    """Get inventory summary for pharmacist dashboard."""
    total_products = Product.objects.filter(is_active=True).count()
    low_stock_items = Product.objects.filter(
        is_active=True,
        stock_quantity__lte=models.F("reorder_threshold"),
        stock_quantity__gt=0,
    ).count()
    out_of_stock_items = Product.objects.filter(
        is_active=True, stock_quantity=0
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
        # Log request information
        print("[Inventory Debug] Request details:")
        print(f"  User: {request.user.username}")
        print(f"  Groups: {[g.name for g in request.user.groups.all()]}")
        print(f"  Is staff: {request.user.is_staff}")
        print(f"  Is pharmacist: {hasattr(request.user, 'is_pharmacist') and request.user.is_pharmacist}")
        print(f"  Is admin: {hasattr(request.user, 'is_admin') and request.user.is_admin}")
        
        # Get base queryset
        products = Product.objects.filter(is_active=True).order_by("name")
        print(f"[Inventory Debug] Initial active products: {products.count()}")
        
        # Search functionality
        search = request.GET.get("search", "").strip()
        if search:
            products = products.filter(
                Q(name__icontains=search) |
                Q(category__icontains=search) |
                Q(supplier__icontains=search)
            )
            print(f"[Inventory Debug] After search filter: {products.count()} products")
        print("\n[Inventory Debug] *** INVENTORY LIST REQUEST ***")
        print("[Inventory Debug] URL Path:", request.path)
        print("[Inventory Debug] Method:", request.method)
        print("[Inventory Debug] Headers:", dict(request.headers))
        print("[Inventory Debug] User Info:")
        print(f"  Username: {request.user.username}")
        print(f"  Groups: {[g.name for g in request.user.groups.all()]}")
        print(f"  Is staff: {request.user.is_staff}")
        print(f"  Is pharmacist: {hasattr(request.user, 'is_pharmacist') and request.user.is_pharmacist}")
        print(f"  Is admin: {hasattr(request.user, 'is_admin') and request.user.is_admin}")
        
        # Get ALL products first for debugging
        all_products = Product.objects.all()
        print("\n[Inventory Debug] Database Query Results:")
        print(f"  Total products in DB: {all_products.count()}")
        print("  Sample products:")
        for p in all_products[:2]:
            print(f"    - {p.id}: {p.name} (Active: {p.is_active}, Stock: {p.stock_quantity})")
        
        # Now get active products
        products = Product.objects.filter(is_active=True).order_by("name")
        print(f"\n[Inventory Debug] Active products: {products.count()}")
        print("  Sample active products:")
        for p in products[:2]:
            print(f"    - {p.id}: {p.name} (Stock: {p.stock_quantity})")
        
        # Search functionality
        search = request.GET.get("search", "").strip()
        if search:
            products = products.filter(
                Q(name__icontains=search) |
                Q(category__icontains=search) |
                Q(supplier__icontains=search)
            )
            print(f"[Inventory Debug] After search filter: {products.count()} products")
        # Filter by category if requested
        category = request.GET.get("category")
        if category:
            products = products.filter(category=category)
            print(f"[Inventory Debug] After category filter: {products.count()} products")

        # Filter by low stock if requested
        low_stock = request.GET.get("low_stock")
        if low_stock == "true":
            products = products.filter(
                stock_quantity__lte=models.F("reorder_threshold"),
                stock_quantity__gt=0
            )
            print(f"[Inventory Debug] After low stock filter: {products.count()} products")

        # Filter by out of stock if requested
        out_of_stock = request.GET.get("out_of_stock")
        if out_of_stock == "true":
            products = products.filter(stock_quantity=0)
            print(f"[Inventory Debug] After out of stock filter: {products.count()} products")

        # Log sample products for debugging
        sample_products = products[:2]
        print("[Inventory Debug] Sample products:")
        for product in sample_products:
            print(f"  - ID: {product.id}")
            print(f"  - Name: {product.name}")
            print(f"  - Category: {product.category}")
            print(f"  - Price: {product.price}")
            print(f"  - Stock: {product.stock_quantity}")
            print(f"  - Active: {product.is_active}")
        
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

        # Serialize and prepare response with additional debug fields
        serialized_products = ProductSerializer(products_page, many=True).data
        
        # Add computed fields that we use in the frontend
        for product in serialized_products:
            product['is_low_stock'] = product['stock_quantity'] <= product.get('reorder_threshold', 10)
            product['in_stock'] = product['stock_quantity'] > 0
        
        response_data = {
            "products": serialized_products,  # This is what the frontend expects
            "totalPages": paginator.num_pages,
            "currentPage": int(page),
            "totalItems": paginator.count,
            "debug": {
                "request": {
                    "user": request.user.username,
                    "groups": [g.name for g in request.user.groups.all()],
                    "is_staff": request.user.is_staff,
                    "is_pharmacist": hasattr(request.user, 'is_pharmacist') and request.user.is_pharmacist,
                    "is_admin": hasattr(request.user, 'is_admin') and request.user.is_admin,
                    "query_params": dict(request.GET)
                },
                "response": {
                    "total_products": products.count(),
                    "products_on_page": len(serialized_products),
                    "sample_products": [
                        {
                            "id": p["id"],
                            "name": p["name"],
                            "category": p["category"],
                            "stock": p["stock_quantity"],
                            "is_low_stock": p["is_low_stock"],
                            "in_stock": p["in_stock"]
                        }
                        for p in serialized_products[:2]
                    ] if serialized_products else []
                }
            }
        }
        
        print("[Inventory Debug] Response data:")
        print(f"  Total items: {response_data['totalItems']}")
        print(f"  Current page: {response_data['currentPage']}")
        print(f"  Total pages: {response_data['totalPages']}")
        print(f"  Products returned: {len(response_data['products'])}")
        
        # Sample of first product if any exist
        if serialized_products:
            print("[Inventory Debug] First product sample:")
            print(f"  ID: {serialized_products[0]['id']}")
            print(f"  Name: {serialized_products[0]['name']}")
            print(f"  Stock: {serialized_products[0]['stock_quantity']}")
            print(f"  Is Low Stock: {serialized_products[0]['is_low_stock']}")
            print(f"  In Stock: {serialized_products[0]['in_stock']}")
        
        return Response(response_data)
        
    except Exception as e:
        print(f"[Inventory Error] Failed to fetch inventory: {str(e)}")
        print(f"[Inventory Error] Error details: {type(e).__name__}")
        print(f"[Inventory Error] User: {request.user.username}")
        print(f"[Inventory Error] Stack trace:", traceback.format_exc())
        return Response(
            {
                "error": "Failed to fetch inventory",
                "detail": str(e),
                "debug": {
                    "error_type": type(e).__name__,
                    "user": request.user.username,
                    "groups": [g.name for g in request.user.groups.all()]
                },
                "timestamp": timezone.now().isoformat()
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def low_stock_items(request):
    """Get list of low stock items."""
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
    """Get list of out of stock items."""
    products = Product.objects.filter(
        is_active=True,
        stock_quantity=0
    ).order_by("name")

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
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
@permission_classes([IsPharmacistOrAdmin])
def stock_logs(request, pk):
    """Get stock logs for a specific product."""
    product = get_object_or_404(Product, pk=pk)
    logs = StockLog.objects.filter(product=product).order_by("-timestamp")
    serializer = StockLogSerializer(logs, many=True)
    return Response(serializer.data)