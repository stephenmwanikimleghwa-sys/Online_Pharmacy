from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum, F, Avg
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from products.models import StockLog, Product
from prescriptions.models import Prescription
from users.models import User
from utils.cache import cache_response

class AnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for analytics and reporting endpoints.
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    @cache_response(timeout=60*60, key_prefix='analytics_trends')
    def inventory_trends(self, request):
        """
        Get inventory stock trends over time.
        Defaults to last 30 days.
        """
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        # Aggregate stock logs by date
        trends = (
            StockLog.objects.filter(timestamp__gte=start_date)
            .annotate(date=TruncDate('timestamp'))
            .values('date')
            .annotate(
                restock_count=Count('id', filter=F('change_type') == 'restock'),
                usage_count=Count('id', filter=F('change_type') == 'usage'),
                total_change=Sum('change_amount')
            )
            .order_by('date')
        )

        return Response({
            'trends': list(trends),
            'period': f'Last {days} days'
        })

    @action(detail=False, methods=['get'])
    def pharmacist_performance(self, request):
        """
        Get performance metrics for pharmacists.
        """
        # Count verified prescriptions by pharmacist
        performance = (
            Prescription.objects.filter(verified_by__isnull=False)
            .values('verified_by__username')
            .annotate(
                verified_count=Count('id'),
                avg_verification_time=Avg(F('verified_at') - F('uploaded_at'))
            )
            .order_by('-verified_count')
        )

        return Response({
            'performance': list(performance)
        })

    @action(detail=False, methods=['get'])
    @cache_response(timeout=60*60, key_prefix='analytics_top_selling')
    def top_selling_products(self, request):
        """
        Get top selling products based on stock logs.
        """
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        logs = StockLog.objects.filter(
            timestamp__gte=start_date,
            change_type='sale'
        )
        
        if hasattr(request.user, 'pharmacy') and request.user.pharmacy:
            logs = logs.filter(product__pharmacy=request.user.pharmacy)

        top_products = (
            logs.values('product__name')
            .annotate(total_sold=Sum('change_amount'))
            .order_by('total_sold')[:5]  # Sales are negative, so ascending order gives largest magnitude? 
            # Wait, if sales are negative, Sum will be negative. e.g. -10, -5. 
            # -10 is "smaller" than -5 but represents more sales.
            # So order_by('total_sold') is correct for most negative first.
        )
        
        # Convert to positive numbers for frontend
        data = [
            {
                'name': item['product__name'],
                'value': abs(item['total_sold'])
            }
            for item in top_products
        ]

        return Response(data)

    @action(detail=False, methods=['get'])
    def low_stock_alerts(self, request):
        """
        Get products that are low on stock.
        """
        products = Product.objects.filter(
            is_active=True,
            stock_quantity__lte=F('reorder_threshold'),
            stock_quantity__gt=0
        )
        
        if hasattr(request.user, 'pharmacy') and request.user.pharmacy:
            products = products.filter(pharmacy=request.user.pharmacy)
            
        alerts = products.values(
            'id', 'name', 'stock_quantity', 'reorder_threshold'
        ).order_by('stock_quantity')[:10]

        return Response(list(alerts))
