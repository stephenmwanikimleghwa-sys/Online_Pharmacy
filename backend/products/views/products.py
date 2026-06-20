from rest_framework import generics, status, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q, Sum
from products.models import Product, BranchStock
from products.serializers import (
    ProductSerializer,
    ProductCreateSerializer,
    ProductUpdateSerializer,
)
from users.permissions import IsPharmacistOrAdmin, IsOwnerOrAdmin
from users.active_branch import get_active_branch
# Pharmacy import removed - single pharmacy app
from rest_framework.request import Request
from django.db.models.query import QuerySet
from typing import List, Any
import logging
from decimal import Decimal
from utils.response import api_response
from users.utils import log_activity

logger = logging.getLogger(__name__)


def _branch_for_request(request):
    active = get_active_branch(request)
    if active:
        return active
    user = getattr(request, "user", None)
    return getattr(user, "branch", None)


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

    def get_queryset(self) -> QuerySet:
        """
        Get the list of items for this view.
        Returns active products ordered by name.
        """
        return (
            Product.objects
            .filter(is_active=True)
            .select_related('pharmacy', 'pricing_tier')
            .prefetch_related('pricing_tier', 'branch_stocks', 'branch_stocks__branch')
            .order_by('name')
        )

    def get_permissions(self) -> List[Any]:
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.request.method == "POST":
            return [IsPharmacistOrAdmin()]
        return [permissions.AllowAny()]

    def get_serializer_class(self) -> Any:
        """
        Return the class to use for the serializer.
        """
        if self.request.method == "POST":
            return ProductCreateSerializer
        return ProductSerializer

    def perform_create(self, serializer: Any) -> None:
        """
        Save the new product instance.
        """
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Log activity
        log_activity(
            user=request.user,
            event_type='PRODUCT_CREATED',
            branch=getattr(request.user, 'branch', None),
            ip_address=request.META.get('REMOTE_ADDR'),
            details_dict={
                'product_id': serializer.instance.id,
                'product_name': serializer.instance.name
            }
        )

        headers = self.get_success_headers(serializer.data)
        return api_response(
            data=serializer.data, 
            message="Product created successfully", 
            status_code=status.HTTP_201_CREATED
        )


class ProductRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific product.
    Only pharmacists or admins can update/delete.
    """

    serializer_class = ProductUpdateSerializer
    lookup_field = "pk"
    permission_classes = [IsPharmacistOrAdmin]

    def get_queryset(self) -> QuerySet:
        """
        Get the queryset for retrieving, updating, or deleting a product.
        """
        return Product.objects.all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_response(data=serializer.data, message="Product retrieved successfully")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        previous_values = {}
        changed_fields = []

        for field_name, new_value in request.data.items():
            if field_name in instance.__dict__:
                previous_value = getattr(instance, field_name)
                previous_values[field_name] = str(previous_value) if isinstance(previous_value, (Decimal,)) else previous_value
                if previous_value != new_value:
                    changed_fields.append(field_name)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        updated_instance = serializer.instance
        new_values = {}
        for field_name in changed_fields:
            new_value = getattr(updated_instance, field_name, None)
            new_values[field_name] = str(new_value) if isinstance(new_value, (Decimal,)) else new_value

        # Log activity with the exact fields that changed
        log_activity(
            user=request.user,
            event_type='PRODUCT_EDITED',
            branch=getattr(request.user, 'branch', None),
            ip_address=request.META.get('REMOTE_ADDR'),
            details_dict={
                'product_id': updated_instance.id,
                'product_name': updated_instance.name,
                'changed_fields': changed_fields,
                'previous_values': previous_values,
                'new_values': new_values,
                'is_partial_update': partial,
            }
        )

        return api_response(data=serializer.data, message="Product updated successfully")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Log activity
        log_activity(
            user=request.user,
            event_type='PRODUCT_DELETED',
            branch=getattr(request.user, 'branch', None),
            ip_address=request.META.get('REMOTE_ADDR'),
            details_dict={
                'product_id': instance.id,
                'product_name': instance.name
            }
        )

        self.perform_destroy(instance)
        return api_response(message="Product deleted successfully", status_code=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def search_products(request: Request) -> Response:
    """
    Advanced search for products by name, category, or description.
    
    Args:
        request: The HTTP request object containing query parameters.
            - q: Search query for name, description, or category.
            - category: Filter by category name.
            - min_price: Filter by minimum price.
            - max_price: Filter by maximum price.
            
    Returns:
        Response: JSON response containing the list of matching products.
    """
    query = request.GET.get("q", "").strip()
    category = request.GET.get("category", "")
    min_price = request.GET.get("min_price", "")
    max_price = request.GET.get("max_price", "")

    products = Product.objects.filter(is_active=True).select_related(
        'pharmacy', 'pricing_tier'
    ).prefetch_related('branch_stocks__branch')

    active_branch = _branch_for_request(request)
    # RULE 8: /products/search always branch-scoped for sales behavior
    if active_branch:
        products = products.filter(
            branch_stocks__branch=active_branch,
            branch_stocks__quantity__gt=0,
        ).distinct()

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

    serializer = ProductSerializer(products.order_by("name"), many=True)
    return api_response(data=serializer.data, message="Search results retrieved successfully")


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_products(request: Request) -> Response:
    """
    List all active products for the authenticated user's pharmacy.
    """
    if not request.user.is_authenticated or request.user.role not in [
        "pharmacist",
        "admin",
    ]:
        return api_response(
            error="Only pharmacists or admins can access products.",
            status_code=status.HTTP_403_FORBIDDEN,
            success=False
        )
    
    products = Product.objects.filter(is_active=True).select_related(
        'pharmacy', 'pricing_tier'
    ).prefetch_related('branch_stocks__branch')
    if request.user.pharmacy:
        products = products.filter(pharmacy=request.user.pharmacy)
    else:
        # If no pharmacy assigned, return empty list or all if superadmin?
        # For now, return empty to avoid leaking data
        products = products.none()

    serializer = ProductSerializer(products, many=True)
    return api_response(data=serializer.data, message="Products retrieved successfully")


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def pricing_summary(request: Request) -> Response:
    """
    Return counts for pricing management UI:
    - total_products
    - priced_count
    - unpriced_count

    This helps the frontend show a global missing-pricing count.
    """
    try:
        from products.models import Product, PricingTier

        total_products = Product.objects.filter(is_active=True).count()
        priced_count = PricingTier.objects.filter(is_active=True).count()
        unpriced_count = total_products - priced_count

        return api_response(
            data={
                "total_products": total_products,
                "priced_count": priced_count,
                "unpriced_count": unpriced_count,
            },
            message="Pricing summary retrieved",
        )
    except Exception as exc:
        logger.exception("Error computing pricing summary: %s", exc)
        return api_response(error="Failed to compute pricing summary", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, success=False)


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

    def get_queryset(self) -> QuerySet:
        """
        Get the queryset for products.
        - List/Retrieve: All active products (aggregator view).
        - Update/Destroy: Only products belonging to user's pharmacy.
        """
        queryset = Product.objects.filter(is_active=True).select_related(
            'pharmacy', 'pricing_tier'
        ).prefetch_related('branch_stocks__branch')

        context = self.request.query_params.get("context")
        active_branch = _branch_for_request(self.request)
        is_public_store = not self.request.user.is_authenticated

        # RULE 2 + RULE 8: sales context shows only in-stock at active branch
        if context == "sales":
            if active_branch:
                queryset = queryset.filter(
                    branch_stocks__branch=active_branch,
                    branch_stocks__quantity__gt=0,
                ).distinct()
            else:
                queryset = queryset.none()
        # RULE 5: public store shows products with stock in at least one branch
        elif context == "store" or is_public_store:
            queryset = queryset.filter(branch_stocks__quantity__gt=0).distinct()
        # RULE 4: inventory context returns all active products
        elif context == "inventory":
            pass
        
        if self.action in ['update', 'partial_update', 'destroy']:
            if self.request.user.is_authenticated and self.request.user.role == 'pharmacist':
                if self.request.user.pharmacy:
                    queryset = queryset.filter(pharmacy=self.request.user.pharmacy)
                else:
                    queryset = queryset.none()
                    
        return queryset.order_by('name')

    def get_permissions(self) -> List[Any]:
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsPharmacistOrAdmin()]
        return [permissions.AllowAny()]

    def get_serializer_class(self) -> Any:
        """
        Return the class to use for the serializer.
        """
        if self.action == 'create':
            return ProductCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProductUpdateSerializer
        return ProductSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return api_response(data=serializer.data, message="Products retrieved successfully")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return api_response(
            data=serializer.data, 
            message="Product created successfully", 
            status_code=status.HTTP_201_CREATED
        )

    def perform_create(self, serializer: Any) -> None:
        """
        Save the new product instance.
        Assigns the product to the user's pharmacy.
        """
        pharmacy = None
        if self.request.user.is_authenticated and self.request.user.pharmacy:
            pharmacy = self.request.user.pharmacy
        
        serializer.save(pharmacy=pharmacy)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return api_response(data=serializer.data, message="Product retrieved successfully")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return api_response(data=serializer.data, message="Product updated successfully")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return api_response(message="Product deleted successfully", status_code=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='featured')
    def featured(self, request: Request) -> Response:
        """
        Get featured products.
        Returns the first 4 products marked as featured.
        """
        try:
            featured_products = self.get_queryset().filter(is_featured=True)[:4]
            serializer = self.get_serializer(featured_products, many=True)
            return api_response(data=serializer.data, message="Featured products retrieved successfully")
        except Exception as exc:
            # Log full exception to help debugging in production logs
            logger.exception("Error while fetching featured products: %s", exc)
            return api_response(
                error="Internal server error while fetching featured products.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                success=False
            )

    @action(detail=True, methods=['get'], url_path='availability')
    def availability(self, request: Request, pk=None) -> Response:
        """
        Cross-branch stock availability for a product.
        """
        from inventory.views.supplier import _user_can_see_transfer_details

        product = self.get_object()
        active_branch = _branch_for_request(request)
        stocks = (
            BranchStock.objects.filter(product=product)
            .select_related("branch")
            .order_by("branch__name")
        )

        active_qty = 0
        active_status = "OUT_OF_STOCK"
        other_branches = []
        available_elsewhere = False

        can_see_details = (
            request.user.is_authenticated
            and _user_can_see_transfer_details(request.user)
        )

        for bs in stocks:
            qty = float(bs.quantity)
            status_label = "IN_STOCK" if qty > 0 else "OUT_OF_STOCK"
            is_active = bool(active_branch and bs.branch_id == active_branch.id)
            if is_active:
                active_qty = qty
                active_status = status_label
            elif qty > 0:
                available_elsewhere = True
                if can_see_details:
                    other_branches.append(
                        {
                            "branch_id": bs.branch_id,
                            "branch_name": bs.branch.name,
                            "quantity": qty,
                            "status": status_label,
                        }
                    )

        payload = {
            "product_id": product.id,
            "product_name": product.name,
            "active_branch": {
                "branch_id": active_branch.id if active_branch else None,
                "branch_name": active_branch.name if active_branch else None,
                "quantity": active_qty,
                "status": active_status,
            },
            "available_elsewhere": available_elsewhere,
        }
        if can_see_details:
            payload["other_branches"] = other_branches
        else:
            payload["message"] = (
                "This product is available at other branches. Contact your administrator."
                if available_elsewhere
                else None
            )
        return Response(payload)

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request: Request) -> Response:
        """
        Create multiple products in bulk.
        Accepts a JSON list of product data.
        If any product fails validation, the entire transaction is rolled back.
        """
        if not isinstance(request.data, list):
            return api_response(
                error="Expected a list of products.",
                status_code=status.HTTP_400_BAD_REQUEST,
                success=False
            )

        created_products = []
        errors = []

        try:
            with transaction.atomic():
                for index, item_data in enumerate(request.data):
                    serializer = self.get_serializer(data=item_data)
                    if serializer.is_valid():
                        self.perform_create(serializer)
                        created_products.append(serializer.data)
                    else:
                        errors.append({"index": index, "errors": serializer.errors})
                
                if errors:
                    # Rollback transaction by raising an exception
                    raise Exception("Validation failed for some items.")
        except Exception as e:
            if errors:
                return api_response(
                    error="Validation failed.",
                    data={"details": errors},
                    status_code=status.HTTP_400_BAD_REQUEST,
                    success=False
                )
            logger.exception("Error during bulk product creation: %s", e)
            return api_response(
                error="An unexpected error occurred during bulk creation.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                success=False
            )

        return api_response(
            data={"created_count": len(created_products), "products": created_products},
            message=f"Successfully created {len(created_products)} products.",
            status_code=status.HTTP_201_CREATED
        )
