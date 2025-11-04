# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.response import Response
# from rest_framework import status
# from django.db.models import Q, Count
# from django.db import models
# from django.shortcuts import get_object_or_404
# from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
# from rest_framework.permissions import IsAuthenticated
# from users.permissions import IsPharmacistOrAdmin
# from products.models import Product
# from products.models import StockLog
# from users.models import User
# 
# 
# from products.serializers import ProductSerializer
# from .serializers import StockLogSerializer
# 
# 
# @api_view(["GET"])
# @permission_classes([IsPharmacistOrAdmin])
# def inventory_summary(request):
#     """
#     Get inventory summary for pharmacist dashboard.
#     Returns total products, low stock items, and out of stock items.
#     """
#     total_products = Product.objects.filter(is_active=True).count()
#     low_stock_items = Product.objects.filter(
#         is_active=True,
#         stock_quantity__lte=models.F("reorder_threshold"),
#         stock_quantity__gt=0,
#     ).count()
#     out_of_stock_items = Product.objects.filter(
#         is_active=True, stock_quantity=0
#     ).count()
# 
#     return Response(
#         {
#             "totalProducts": total_products,
#             "lowStockItems": low_stock_items,
#             "outOfStockItems": out_of_stock_items,
#         }
#     )
# 
# 
# @api_view(["GET"])
# @permission_classes([IsPharmacistOrAdmin])
# def inventory_list(request):
#     """
#     List all inventory items with filtering and pagination.
#     """
#     products = Product.objects.filter(is_active=True).order_by("name")
# 
#     # Filter by low stock if requested
#     low_stock = request.GET.get("low_stock")
#     if low_stock == "true":
#         products = products.filter(
#             stock_quantity__lte=models.F("reorder_threshold"), stock_quantity__gt=0
#         )
# 
#     # Filter by out of stock if requested
#     out_of_stock = request.GET.get("out_of_stock")
#     if out_of_stock == "true":
#         products = products.filter(stock_quantity=0)
# 
#     # Pagination (optional)
#     page = request.GET.get("page", 1)
#     per_page = request.GET.get("per_page", 20)
#     paginator = Paginator(products, per_page)
# 
#     try:
#         products_page = paginator.page(page)
#     except PageNotAnInteger:
#         products_page = paginator.page(1)
#     except EmptyPage:
#         products_page = paginator.page(paginator.num_pages)
# 
#     serializer = ProductSerializer(products_page, many=True)
#     return Response(
#         {
#             "products": serializer.data,
#             "totalPages": paginator.num_pages,
#             "currentPage": page,
#             "totalItems": paginator.count,
#         }
#     )
# 
# 
# @api_view(["GET"])
# @permission_classes([IsPharmacistOrAdmin])
# def low_stock_items(request):
#     """
#     Get list of low stock items.
#     """
#     products = Product.objects.filter(
#         is_active=True,
#         stock_quantity__lte=models.F("reorder_threshold"),
#         stock_quantity__gt=0,
#     ).order_by("stock_quantity")
# 
#     serializer = ProductSerializer(products, many=True)
#     return Response(serializer.data)
# 
# 
# @api_view(["GET"])
# @permission_classes([IsPharmacistOrAdmin])
# def out_of_stock_items(request):
#     """
#     Get list of out of stock items.
#     """
#     products = Product.objects.filter(is_active=True, stock_quantity=0).order_by("name")
# 
#     serializer = ProductSerializer(products, many=True)
#     return Response(serializer.data)
# 
# 
# @api_view(["GET"])
# @permission_classes([IsPharmacistOrAdmin])
# def inventory_detail(request, pk):
#     """
#     Get detailed information about a specific inventory item.
#     """
#     product = get_object_or_404(Product, pk=pk, is_active=True)
#     serializer = ProductSerializer(product)
#     return Response(serializer.data)
# 
# 
# @api_view(["POST"])
# @permission_classes([IsPharmacistOrAdmin])
# def restock_inventory(request, pk):
#     """
#     Restock an inventory item.
#     """
#     product = get_object_or_404(Product, pk=pk)
#     quantity = request.data.get("quantity")
#     reason = request.data.get("reason", "Restock")
# 
#     if not quantity or quantity <= 0:
#         return Response(
#             {"error": "Quantity must be a positive number."},
#             status=status.HTTP_400_BAD_REQUEST,
#         )
# 
#     # Update stock quantity
#     previous_quantity = product.stock_quantity
#     product.stock_quantity += quantity
#     product.save()
# 
#     # Create stock log
#     StockLog.objects.create(
#         product=product,
#         previous_quantity=previous_quantity,
#         new_quantity=product.stock_quantity,
#         change_amount=quantity,
#         change_type="restock",
#         reason=reason,
#         logged_by=request.user,
#     )
# 
#     serializer = ProductSerializer(product)
#     return Response(serializer.data)
# 
# 
# @api_view(["GET"])
# @permission_classes([IsPharmacistOrAdmin])
# def stock_logs(request, pk):
#     """
#     Get stock logs for a specific product.
#     """
#     product = get_object_or_404(Product, pk=pk)
#     logs = StockLog.objects.filter(product=product).order_by("-timestamp")
#     serializer = StockLogSerializer(logs, many=True)
#     return Response(serializer.data)
