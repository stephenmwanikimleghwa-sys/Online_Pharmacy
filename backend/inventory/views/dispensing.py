from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin, IsAuditorOrAdmin
from users.active_branch import get_active_branch, require_active_branch
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
from config.api_responses import ApiErrorCode, api_error, api_success

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
            return api_error(
                ApiErrorCode.VALIDATION_ERROR,
                "Only pending prescriptions can be verified.",
                details={"status": prescription.status},
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
        qs = (
            Dispensation.objects
            .select_related('dispensed_by', 'customer')
            .prefetch_related('items', 'items__product')
            .all()
            .order_by('-dispensed_at')
        )
        is_admin = user.is_superuser or getattr(user, 'role', None) == 'admin'
        branch_param = self.request.query_params.get('branch')
        if is_admin and branch_param and branch_param != 'all':
            qs = qs.filter(branch_id=branch_param)
        elif not is_admin and user.branch:
            qs = qs.filter(branch=user.branch)
            
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(items__product__name__icontains=search) |
                Q(notes__icontains=search) |
                Q(patient_name__icontains=search)
            ).distinct()
            
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(dispensed_at__date=date)
            
        return qs

    def get_permissions(self):
        if self.action == 'create':
            return [IsPharmacistOrAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        denied = require_active_branch(self.request)
        if denied:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(denied.data.get("detail", "Active branch required."))
        branch = get_active_branch(self.request)
        with transaction.atomic():
            dispensation = serializer.save(
                dispensed_by=self.request.user,
                branch=branch,
            )
            if dispensation.prescription:
                dispensation.prescription.status = 'dispensed'
                dispensation.prescription.save()

@api_view(['POST'])
@permission_classes([IsPharmacistOrAdmin])
def dispense_otc(request):
    """
    Dispense medicines — stamps the user's branch on the sale.
    Handles payment modes, credit limits, and branch stock.
    """
    denied = require_active_branch(request)
    if denied:
        return denied

    from django.contrib.auth import get_user_model
    User = get_user_model()
    active_branch = get_active_branch(request)

    with transaction.atomic():
        items_data = request.data.get('items', [])
        payment_mode = request.data.get('payment_mode', 'CASH')
        pricing_tier = request.data.get('pricing_tier', 'RETAIL')
        customer_id = request.data.get('customer_id')
        discount = request.data.get('discount', 0)
        
        customer = None
        if customer_id:
            customer = get_object_or_404(User, pk=customer_id)
            
        from products.models import BranchStock, StockLog
        from inventory.models.finance import CashFlow
        
        total_amount = 0
        products_to_dispense = []
        
        # Pre-check stock and calculate total
        for item in items_data:
            product = get_object_or_404(Product, pk=item['product_id'])
            branch_stock, _ = BranchStock.objects.get_or_create(
                product=product, branch=active_branch, defaults={'quantity': 0, 'reorder_level': 0}
            )
            available = branch_stock.quantity
            if available < item['quantity']:
                return api_error(
                    ApiErrorCode.INSUFFICIENT_STOCK,
                    f"{product.name} only has {available} units available at {active_branch.name}.",
                    details={
                        "product_name": product.name,
                        "available": available,
                        "requested": item['quantity'],
                        "branch": active_branch.name,
                    },
                )
            
            price = product.wholesale_price if pricing_tier == 'WHOLESALE' and product.wholesale_price else product.price
            item_total = float(price) * item['quantity']
            total_amount += item_total
            products_to_dispense.append({
                'product': product,
                'branch_stock': branch_stock,
                'quantity': item['quantity'],
                'price': price,
                'item_total': item_total
            })

        total_amount -= float(discount)
        
        if payment_mode == 'CREDIT':
            if not customer:
                return api_error(
                    ApiErrorCode.VALIDATION_ERROR,
                    "A customer is required for credit sales.",
                )
            if float(customer.credit_balance) + total_amount > float(customer.credit_limit):
                customer_name = getattr(customer, 'username', None) or str(customer)
                return api_error(
                    ApiErrorCode.CREDIT_LIMIT_EXCEEDED,
                    f"{customer_name} has reached their credit limit.",
                    details={
                        "customer_name": customer_name,
                        "balance": float(customer.credit_balance),
                        "credit_limit": float(customer.credit_limit),
                        "requested_total": total_amount,
                    },
                )

        dispensation = Dispensation.objects.create(
            sale_type='otc',
            patient_name=request.data.get('patient_name', ''),
            customer=customer,
            payment_mode=payment_mode,
            pricing_tier=pricing_tier,
            discount=discount,
            dispensed_by=request.user,
            branch=active_branch,
            notes=request.data.get('notes', ''),
            total_amount=total_amount
        )

        for p_data in products_to_dispense:
            product = p_data['product']
            quantity = p_data['quantity']
            branch_stock = p_data['branch_stock']
            
            DispensationItem.objects.create(
                dispensation=dispensation,
                product=product,
                quantity=quantity,
                price_per_unit=p_data['price'],
                total_price=p_data['item_total'],
                expiry_date=product.expiry_date
            )
            
            prev_qty = branch_stock.quantity
            branch_stock.quantity -= quantity
            branch_stock.save(update_fields=['quantity'])
            
            StockLog.objects.create(
                product=product,
                branch=active_branch,
                logged_by=request.user,
                change_type='sale',
                change_amount=-quantity,
                previous_quantity=prev_qty,
                new_quantity=branch_stock.quantity,
                reason=f"Dispensation #{dispensation.id}"
            )

        if payment_mode == 'CREDIT':
            from users.models import CustomerDebtTransaction
            customer.credit_balance = float(customer.credit_balance) + total_amount
            customer.save(update_fields=['credit_balance'])
            CustomerDebtTransaction.objects.create(
                customer=customer,
                transaction_type='CREDIT_SALE',
                amount=total_amount,
                balance_after=customer.credit_balance,
                description=f"Dispensation #{dispensation.id}",
                processed_by=request.user
            )
        else:
            CashFlow.objects.create(
                netflow=total_amount,
                paymentmode=payment_mode,
                explanation=f"Dispensation #{dispensation.id}",
                branch=active_branch,
                timestamp=timezone.now()
            )

        from users.utils import log_activity
        log_activity(
            user=request.user,
            event_type='SALE_MADE',
            branch=active_branch,
            details_dict={
                'dispensation_id': dispensation.id,
                'total_amount': total_amount,
                'items_count': len(products_to_dispense),
                'payment_mode': payment_mode
            }
        )

        item_count = len(products_to_dispense)
        return api_success(
            f"{item_count} item(s) sold. Total: KES {total_amount:.2f}.",
            data=DispensationSerializer(dispensation).data,
            extra={"dispensation": DispensationSerializer(dispensation).data},
        )

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

    from products.models import BranchStock
    expired_qs = BranchStock.objects.filter(
        product__expiry_date__lt=today,
        quantity__gt=0
    )
    if is_admin and branch_param and branch_param != 'all':
        expired_qs = expired_qs.filter(branch_id=branch_param)
    elif not is_admin and user.branch:
        expired_qs = expired_qs.filter(branch=user.branch)
        
    expired_stock = expired_qs.aggregate(
        total_items=Count('product', distinct=True),
        total_value=Sum(F('quantity') * F('product__price'))
    )

    return Response({
        'today': today_stats,
        'month': monthly_stats,
        'top_products': list(top_products),
        'expired_stock': expired_stock
    })