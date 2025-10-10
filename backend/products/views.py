from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Product
from .serializers import (
    ProductSerializer,
    ProductCreateSerializer,
    ProductUpdateSerializer,
)
from users.permissions import IsPharmacistOrAdmin, IsOwnerOrAdmin
# Pharmacy import removed - single pharmacy app


class ProductListCreateView(generics.ListCreateAPIView):
    """
    List all products with search and filtering (by category, price range).
    Create a new product (only for pharmacists or admins).
    """

    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "description", "category"]
    filterset_fields = ["category", "price"]
    ordering_fields = ["name", "price", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Product.objects.filter(is_active=True)

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsPharmacistOrAdmin()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductCreateSerializer
        return ProductSerializer

    def perform_create(self, serializer):
        serializer.save()


class ProductRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific product.
    Only pharmacists or admins can update/delete.
    """

    serializer_class = ProductUpdateSerializer
    lookup_field = "pk"
    permission_classes = [IsPharmacistOrAdmin]

    def get_queryset(self):
        return Product.objects.all()


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def search_products(request):
    """
    Advanced search for products by name, category, or description.
    """
    query = request.GET.get("q", "")
    category = request.GET.get("category", "")
    min_price = request.GET.get("min_price", "")
    max_price = request.GET.get("max_price", "")

    products = Product.objects.filter(is_active=True)

    if query:
        products = products.filter(
            Q(name__icontains=query)
            | Q(description__icontains=query)
            | Q(category__icontains=query)
        )

    if category:
        products = products.filter(category__icontains=category)

    if min_price:
        products = products.filter(price__gte=min_price)

    if max_price:
        products = products.filter(price__lte=max_price)

    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_products(request):
    """
    List all active products (for authenticated pharmacists or admins).
    """
    if not request.user.is_authenticated or request.user.role not in [
        "pharmacist",
        "admin",
    ]:
        return Response(
            {"error": "Only pharmacists or admins can access products."},
            status=status.HTTP_403_FORBIDDEN,
        )

    products = Product.objects.filter(is_active=True)
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


class FeaturedProductsView(generics.ListAPIView):
    """
    Get featured products (e.g., popular or low-stock items).
    """

    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Example: Featured = low stock or high rating (customize as needed)
        return Product.objects.filter(is_active=True).order_by("-created_at")[:10]
