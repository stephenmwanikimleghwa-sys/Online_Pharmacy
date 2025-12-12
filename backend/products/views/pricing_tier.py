from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from products.models import PricingTier, Product
from products.serializers import PricingTierSerializer
from users.permissions import IsPharmacistOrAdmin


class PricingTierViewSet(viewsets.ModelViewSet):
    """
    API viewset for managing pricing tiers.
    
    Provides CRUD operations for creating and managing tiered pricing
    for products (wholesale vs retail).
    
    Only admins and pharmacists can manage pricing tiers.
    """
    
    queryset = PricingTier.objects.all()
    serializer_class = PricingTierSerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacistOrAdmin]
    filterset_fields = ['product', 'is_active']
    ordering_fields = ['product__name', 'created_at', 'buying_price']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter pricing tiers based on user role."""
        queryset = PricingTier.objects.all()
        
        # Filter by product ID if provided
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active in ['true', 'True', '1']:
            queryset = queryset.filter(is_active=True)
        elif is_active in ['false', 'False', '0']:
            queryset = queryset.filter(is_active=False)
        
        return queryset

    @action(detail=False, methods=['get'])
    def by_product(self, request):
        """
        Get pricing tier for a specific product.
        
        Query params:
        - product_id: ID of the product
        """
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response(
                {'error': 'product_id query parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pricing_tier = PricingTier.objects.get(product_id=product_id)
            serializer = self.get_serializer(pricing_tier)
            return Response(serializer.data)
        except PricingTier.DoesNotExist:
            return Response(
                {'error': f'No pricing tier found for product {product_id}'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def create_for_product(self, request):
        """
        Create or update pricing tier for a product.
        
        Request body:
        {
            "product_id": integer,
            "buying_price": decimal,
            "minimum_wholesale_quantity": integer (optional, default 10),
            "is_active": boolean (optional, default true)
        }
        """
        product_id = request.data.get('product_id')
        if not product_id:
            return Response(
                {'error': 'product_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': f'Product {product_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create pricing tier
        pricing_tier, created = PricingTier.objects.get_or_create(product=product)
        
        # Update with provided data
        serializer = self.get_serializer(
            pricing_tier,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    'message': 'Pricing tier created' if created else 'Pricing tier updated',
                    'data': serializer.data
                },
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary statistics for all pricing tiers."""
        queryset = self.get_queryset()
        
        return Response({
            'total_products_with_tiers': queryset.count(),
            'active_tiers': queryset.filter(is_active=True).count(),
            'inactive_tiers': queryset.filter(is_active=False).count(),
            'average_buying_price': self._get_average_price(queryset, 'buying_price'),
            'average_wholesale_price': self._get_average_price(queryset, 'wholesale_price'),
            'average_retail_price': self._get_average_price(queryset, 'retail_price'),
        })

    @staticmethod
    def _get_average_price(queryset, field_name):
        """Helper to calculate average price."""
        from django.db.models import Avg
        avg = queryset.aggregate(avg_price=Avg(field_name))
        return float(avg['avg_price']) if avg['avg_price'] else 0
