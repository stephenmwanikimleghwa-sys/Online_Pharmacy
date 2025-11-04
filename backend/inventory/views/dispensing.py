from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from ..models.dispensing import (
    Prescription,
    PrescriptionItem,
    Dispensation,
    DispensationItem
)
from products.models import Product

from ..serializers.dispensing import (
    PrescriptionSerializer,
    PrescriptionItemSerializer,
    DispensationSerializer,
    DispensationItemSerializer
)

class PrescriptionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsPharmacistOrAdmin]
    serializer_class = PrescriptionSerializer
    queryset = Prescription.objects.all().order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        prescription = self.get_object()
        if prescription.status != 'pending':
            return Response(
                {'error': 'Only pending prescriptions can be verified'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        prescription.status = 'verified'
        prescription.verified_by = request.user
        prescription.save()
        
        return Response(self.get_serializer(prescription).data)

class DispensationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsPharmacistOrAdmin]
    serializer_class = DispensationSerializer
    queryset = Dispensation.objects.all().order_by('-dispensed_at')
    
    def perform_create(self, serializer):
        with transaction.atomic():
            dispensation = serializer.save(dispensed_by=self.request.user)
            
            # If this is a prescription dispensation, update prescription status
            if dispensation.prescription:
                dispensation.prescription.status = 'dispensed'
                dispensation.prescription.save()

@api_view(['POST'])
@permission_classes([IsPharmacistOrAdmin])
def dispense_otc(request):
    """
    Dispense over-the-counter medicines
    Expects:
    {
        "patient_name": "string",  # optional
        "items": [
            {
                "product_id": int,
                "quantity": int
            }
        ],
        "notes": "string"  # optional
    }
    """
    with transaction.atomic():
        # Validate stock availability
        items_data = request.data.get('items', [])
        for item in items_data:
            product = get_object_or_404(Product, pk=item['product_id'])
            if product.stock_quantity < item['quantity']:
                return Response(
                    {
                        'error': f'Insufficient stock for {product.name}. '
                        f'Available: {product.stock_quantity}'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create dispensation
        dispensation = Dispensation.objects.create(
            sale_type='otc',
            patient_name=request.data.get('patient_name', ''),
            dispensed_by=request.user,
            notes=request.data.get('notes', ''),
            total_amount=0  # Will be updated after adding items
        )
        
        total_amount = 0
        # Create dispensation items
        for item in items_data:
            product = Product.objects.get(pk=item['product_id'])
            quantity = item['quantity']
            
            DispensationItem.objects.create(
                dispensation=dispensation,
                product=product,
                quantity=quantity,
                price_per_unit=product.price,
                total_price=product.price * quantity,
                expiry_date=product.expiry_date
            )
            
            total_amount += product.price * quantity
        
        dispensation.total_amount = total_amount
        dispensation.save()
        
        return Response(DispensationSerializer(dispensation).data)

@api_view(['GET'])
@permission_classes([IsPharmacistOrAdmin])
def dispensing_stats(request):
    """
    Get dispensing statistics for different time periods
    """
    today = timezone.now().date()
    thirty_days_ago = today - timedelta(days=30)
    
    # Today's stats
    today_stats = Dispensation.objects.filter(
        dispensed_at__date=today
    ).aggregate(
        total_sales=Count('id'),
        total_revenue=Sum('total_amount'),
        otc_sales=Count('id', filter=Q(sale_type='otc')),
        prescription_sales=Count('id', filter=Q(sale_type='prescription'))
    )
    
    # Monthly stats
    monthly_stats = Dispensation.objects.filter(
        dispensed_at__date__gte=thirty_days_ago
    ).aggregate(
        total_sales=Count('id'),
        total_revenue=Sum('total_amount'),
        otc_sales=Count('id', filter=Q(sale_type='otc')),
        prescription_sales=Count('id', filter=Q(sale_type='prescription'))
    )
    
    # Top selling products this month
    top_products = DispensationItem.objects.filter(
        dispensation__dispensed_at__date__gte=thirty_days_ago
    ).values(
        'product__name'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum('total_price')
    ).order_by('-total_quantity')[:10]
    
    # Expired stock value
    expired_stock = Product.objects.filter(
        expiry_date__lt=today,
        stock_quantity__gt=0
    ).aggregate(
        total_items=Count('id'),
        total_value=Sum(models.F('stock_quantity') * models.F('price'))
    )
    
    return Response({
        'today': today_stats,
        'month': monthly_stats,
        'top_products': list(top_products),
        'expired_stock': expired_stock
    })