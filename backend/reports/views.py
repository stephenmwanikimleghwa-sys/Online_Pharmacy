from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Sum, F, Avg
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.http import FileResponse
from datetime import timedelta
from products.models import StockLog, Product
from prescriptions.models import Prescription
from users.models import User
from utils.cache import cache_response
from utils.pdf_generator import PDFGenerator

from users.permissions import IsAuditorOrAdmin

class AnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for analytics and reporting endpoints.
    """
    permission_classes = [IsAuditorOrAdmin]

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
        from products.models import BranchStock
        
        qs = BranchStock.objects.filter(
            product__is_active=True,
            quantity__lte=F('reorder_level'),
            quantity__gt=0
        )
        
        user = request.user
        is_admin = getattr(user, 'role', None) == 'admin' or user.is_superuser
        branch_param = request.query_params.get('branch')
        
        if is_admin and branch_param and branch_param != 'all':
            qs = qs.filter(branch_id=branch_param)
        elif not is_admin and user.branch:
            qs = qs.filter(branch=user.branch)
            
        alerts = qs.values(
            id=F('product__id'), 
            name=F('product__name'), 
            stock_quantity=F('quantity'), 
            reorder_threshold=F('reorder_level')
        ).order_by('quantity')[:10]
        
        return Response(list(alerts))

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """
        Generate a summary PDF report containing trends, top sellers, and low stock items.
        """
        days = int(request.query_params.get('days', 30))
        
        # 1. Fetch Trends
        trends_resp = self.inventory_trends(request)
        trends_data = trends_resp.data.get('trends', [])
        
        # 2. Fetch Top Selling
        top_selling_resp = self.top_selling_products(request)
        top_selling_data = top_selling_resp.data
        
        # 3. Fetch Low Stock
        low_stock_resp = self.low_stock_alerts(request)
        low_stock_data = low_stock_resp.data

        # Compile for PDF Generator
        data = {
            "Inventory Trends (Last 30 Days)": trends_data,
            "Top Selling Products": top_selling_data,
            "Low Stock Critical Alerts": low_stock_data
        }

        generator = PDFGenerator()
        pdf_buffer = generator.generate_analytics_report(data, title=f"Pharmacy Performance Summary ({days} Days)")
        
        filename = f"pharmacy_report_{timezone.now().strftime('%Y%m%d')}.pdf"
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf'
        )
