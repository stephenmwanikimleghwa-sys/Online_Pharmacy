from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
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
        return Product.objects.filter(is_active=True).order_by('name')

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


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product model providing CRUD operations and custom actions.
    """
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "description", "category"]
    filterset_fields = ["category", "price"]
    ordering_fields = ["name", "price", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsPharmacistOrAdmin()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action == 'create':
            return ProductCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProductUpdateSerializer
        return ProductSerializer

    @action(detail=False, methods=['get'], url_path='featured')
    def featured(self, request):
        """
        Get featured products.
        Returns the first 4 products marked as featured.
        """
        featured_products = self.get_queryset().filter(is_featured=True)[:4]
        serializer = self.get_serializer(featured_products, many=True)
        return Response(serializer.data)
