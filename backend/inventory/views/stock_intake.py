from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum
from django.utils import timezone
from ..models.stock_intake import StockIntake
from ..serializers.stock_intake import StockIntakeSerializer, StockIntakeDetailSerializer


class StockIntakeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing stock intake records.
    Only admins and pharmacists can record new stock intakes.
    """
    queryset = StockIntake.objects.select_related('product', 'received_by').all()
    serializer_class = StockIntakeSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return StockIntakeDetailSerializer
        return StockIntakeSerializer

    def get_queryset(self):
        """Filter queryset based on user role and query params."""
        user = self.request.user
        queryset = StockIntake.objects.select_related('product', 'received_by').all()

        # Customers can only see their own received stock (if applicable)
        if user.role == 'customer':
            queryset = queryset.none()

        # Filter by product if provided
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        # Filter by distributor
        distributor = self.request.query_params.get('distributor')
        if distributor:
            queryset = queryset.filter(distributor_name__icontains=distributor)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(received_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(received_date__lte=end_date)

        return queryset.order_by('-received_date')

    def create(self, request, *args, **kwargs):
        """Create a new stock intake record."""
        # Only admins and pharmacists can record intake
        if request.user.role not in ['admin', 'pharmacist']:
            return Response(
                {'detail': 'Only admins and pharmacists can record stock intake.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(received_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary statistics for stock intake."""
        queryset = self.get_queryset()
        
        summary_data = {
            'total_records': queryset.count(),
            'total_quantity_received': queryset.aggregate(Sum('quantity_received'))['quantity_received__sum'] or 0,
            'total_cost': queryset.aggregate(Sum('total_cost'))['total_cost__sum'] or 0,
            'distributors': queryset.values_list('distributor_name', flat=True).distinct().count(),
        }
        
        return Response(summary_data)

    @action(detail=False, methods=['get'])
    def by_distributor(self, request):
        """Get stock intake records grouped by distributor."""
        queryset = self.get_queryset()
        
        distributors = {}
        for record in queryset:
            if record.distributor_name not in distributors:
                distributors[record.distributor_name] = {
                    'name': record.distributor_name,
                    'total_quantity': 0,
                    'total_cost': 0,
                    'records_count': 0,
                    'latest_date': None,
                }
            
            distributors[record.distributor_name]['total_quantity'] += record.quantity_received
            distributors[record.distributor_name]['total_cost'] += float(record.total_cost)
            distributors[record.distributor_name]['records_count'] += 1
            
            if not distributors[record.distributor_name]['latest_date'] or \
               record.received_date > distributors[record.distributor_name]['latest_date']:
                distributors[record.distributor_name]['latest_date'] = record.received_date

        return Response(list(distributors.values()))

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get stock that is expiring within 3 months."""
        from datetime import timedelta
        
        queryset = self.get_queryset()
        soon = timezone.now() + timedelta(days=90)
        
        expiring_stock = queryset.filter(
            expiry_date__isnull=False,
            expiry_date__lte=soon,
            expiry_date__gte=timezone.now()
        ).order_by('expiry_date')
        
        serializer = self.get_serializer(expiring_stock, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get stock that has already expired."""
        queryset = self.get_queryset()
        expired_stock = queryset.filter(
            expiry_date__isnull=False,
            expiry_date__lt=timezone.now()
        ).order_by('expiry_date')
        
        serializer = self.get_serializer(expired_stock, many=True)
        return Response(serializer.data)
