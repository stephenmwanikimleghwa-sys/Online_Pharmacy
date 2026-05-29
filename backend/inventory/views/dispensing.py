from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin, IsAuditorOrAdmin
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Sum, Count, Q, F
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
    permission_classes = [IsAuditorOrAdmin]
    serializer_class = PrescriptionSerializer
    queryset = Prescription.objects.all().order_by('-created_at')
    
    def get_permissions(self):
        if self.action in ['create', 'verify', 'update', 'partial_update', 'destroy']:
            return [IsPharmacistOrAdmin()]
        return super().get_permissions()

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
    permission_classes = [IsAuditorOrAdmin]
    serializer_class = DispensationSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Dispensation.objects.none()
            
        user = self.request.user
        qs = Dispensation.objects.all().order_by('-dispensed_at')
        is_admin = user.is_superuser or getattr(user, 'role', None) == 'admin'
        branch_param = self.request.query_params.get('branch')
        if is_admin and branch_param and branch_param != 'all':
            qs = qs.filter(branch_id=branch_param)
        elif not is_admin and user.branch:
            qs = qs.filter(branch=user.branch)
        return qs

    def get_permissions(self):
        if self.action == 'create':
            return [IsPharmacistOrAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        with transaction.atomic():
            dispensation = serializer.save(
                dispensed_by=self.request.user,
                branch=self.request.user.branch
            )
            if dispensation.prescription:
                dispensation.prescription.status = 'dispensed'
                dispensation.prescription.save()

@api_view(['POST'])
@permission_classes([IsPharmacistOrAdmin])
def dispense_otc(request):
    """
    Dispense over-the-counter medicines — stamps the user's branch on the sale.
    """
    with transaction.atomic():
        items_data = request.data.get('items', [])
        for item in items_data:
            product = get_object_or_404(Product, pk=item['product_id'])
            if product.stock_quantity < item['quantity']:
                return Response(
                    {'error': f'Insufficient stock for {product.name}. Available: {product.stock_quantity}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        dispensation = Dispensation.objects.create(
            sale_type='otc',
            patient_name=request.data.get('patient_name', ''),
            dispensed_by=request.user,
            branch=request.user.branch,   # ← stamp branch
            notes=request.data.get('notes', ''),
            total_amount=0
        )

        total_amount = 0
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
@permission_classes([IsAuditorOrAdmin])
def dispensing_stats(request):
    """
    Get dispensing statistics. Supports ?branch=<id> for admins.
    """
    today = timezone.now().date()
    thirty_days_ago = today - timedelta(days=30)

    user = request.user
    is_admin = user.is_superuser or user.role == 'admin'
    branch_param = request.query_params.get('branch')

    qs = Dispensation.objects.all()
    if is_admin and branch_param and branch_param != 'all':
        qs = qs.filter(branch_id=branch_param)
    elif not is_admin and user.branch:
        qs = qs.filter(branch=user.branch)

    today_stats = qs.filter(dispensed_at__date=today).aggregate(
        total_sales=Count('id'),
        total_revenue=Sum('total_amount'),
        otc_sales=Count('id', filter=Q(sale_type='otc')),
        prescription_sales=Count('id', filter=Q(sale_type='prescription'))
    )

    monthly_stats = qs.filter(dispensed_at__date__gte=thirty_days_ago).aggregate(
        total_sales=Count('id'),
        total_revenue=Sum('total_amount'),
        otc_sales=Count('id', filter=Q(sale_type='otc')),
        prescription_sales=Count('id', filter=Q(sale_type='prescription'))
    )

    top_products = DispensationItem.objects.filter(
        dispensation__in=qs.filter(dispensed_at__date__gte=thirty_days_ago)
    ).values('product__name').annotate(
        total_quantity=Sum('quantity'),
        total_revenue=Sum('total_price')
    ).order_by('-total_quantity')[:10]

    expired_stock = Product.objects.filter(
        expiry_date__lt=today,
        stock_quantity__gt=0
    ).aggregate(
        total_items=Count('id'),
        total_value=Sum(F('stock_quantity') * F('price'))
    )

    return Response({
        'today': today_stats,
        'month': monthly_stats,
        'top_products': list(top_products),
        'expired_stock': expired_stock
    })