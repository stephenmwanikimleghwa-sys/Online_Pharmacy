from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin, IsAuditorOrAdmin
from users.active_branch import get_active_branch, require_active_branch, resolve_request_branch, filter_queryset_for_branch
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
from ..models.batch import Batch
from products.models import Product, BranchStock

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
    permission_classes = [IsPharmacistOrAdmin]
    serializer_class = DispensationSerializer

    def destroy(self, request, *args, **kwargs):
        from rest_framework.exceptions import MethodNotAllowed
        raise MethodNotAllowed("DELETE", detail="Dispensation records cannot be deleted to preserve audit integrity.")


    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Dispensation.objects.none()
            
        user = self.request.user
        qs = (
            Dispensation.objects
            .select_related('dispensed_by', 'customer', 'branch')
            .prefetch_related('items', 'items__product')
            .all()
            .order_by('-dispensed_at')
        )
        qs = filter_queryset_for_branch(self.request, qs, branch_field='branch')
            
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

    @action(detail=True, methods=['post'])
    def void_sale(self, request, pk=None):
        """
        Voids a dispensation, restoring stock and reversing financials.
        """
        dispensation = self.get_object()
        
        # We check notes or some flag to ensure it's not already voided
        if dispensation.notes and '[VOIDED]' in dispensation.notes:
            return api_error(
                ApiErrorCode.VALIDATION_ERROR,
                "This sale has already been voided.",
            )

        with transaction.atomic():
            # 1. Restore stock to batches and branch stock
            from products.models import BranchStock, StockLog
            for item in dispensation.items.all():
                if item.batch_number:
                    from inventory.models import Batch
                    try:
                        batch = Batch.objects.get(
                            batch_number=item.batch_number,
                            product=item.product,
                            branch=dispensation.branch
                        )
                        batch.quantity_remaining += item.quantity
                        batch.save(update_fields=['quantity_remaining'])
                    except Batch.DoesNotExist:
                        pass  # Legacy or missing batch, fallback to just BranchStock
                
                branch_stock, _ = BranchStock.objects.get_or_create(
                    product=item.product,
                    branch=dispensation.branch,
                    defaults={'quantity': 0}
                )
                prev_qty = branch_stock.quantity
                new_qty = prev_qty + item.quantity
                
                StockLog.objects.create(
                    product=item.product,
                    branch=dispensation.branch,
                    previous_quantity=prev_qty,
                    new_quantity=new_qty,
                    change_amount=item.quantity,
                    change_type='return_in',
                    reason=f"Sale #{dispensation.id} voided",
                    logged_by=request.user
                )
                
                branch_stock.quantity = new_qty
                branch_stock.save()

            # 2. Reverse financials
            if dispensation.payment_mode == 'CREDIT' and dispensation.customer:
                from users.models import CustomerDebtTransaction
                customer = dispensation.customer
                
                # Lock for update
                from django.contrib.auth import get_user_model
                User = get_user_model()
                locked_customer = User.objects.select_for_update().get(id=customer.id)
                
                locked_customer.credit_balance = float(locked_customer.credit_balance) - float(dispensation.total_amount)
                locked_customer.save(update_fields=['credit_balance'])
                
                CustomerDebtTransaction.objects.create(
                    customer=locked_customer,
                    transaction_type='ADJUSTMENT',
                    amount=-float(dispensation.total_amount),
                    balance_after=locked_customer.credit_balance,
                    description=f"Voided Dispensation #{dispensation.id}",
                    branch=dispensation.branch,
                    created_by=request.user
                )
            else:
                from inventory.models.finance import CashFlow
                CashFlow.objects.create(
                    netflow=-float(dispensation.total_amount),
                    paymentmode=dispensation.payment_mode,
                    explanation=f"Voided Dispensation #{dispensation.id}",
                    branch=dispensation.branch,
                    timestamp=timezone.now()
                )
            
            # 3. Mark as voided
            dispensation.notes = f"[VOIDED by {request.user.username}] " + (dispensation.notes or '')
            dispensation.total_amount = 0
            dispensation.save(update_fields=['notes', 'total_amount'])

        return api_success("Sale voided successfully and stock restored.")

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
    active_branch = resolve_request_branch(request, request.data.get('branch_id'))
    if not active_branch:
        return api_error(
            ApiErrorCode.BRANCH_ACCESS_DENIED,
            "A valid active branch is required to complete this sale.",
            http_status=403,
        )

    with transaction.atomic():
        items_data = request.data.get('items', [])
        payment_mode = request.data.get('payment_mode', 'CASH')
        pricing_tier = request.data.get('pricing_tier', 'RETAIL')
        customer_id = request.data.get('customer_id')
        discount = request.data.get('discount', 0)
        try:
            discount = float(discount)
        except (TypeError, ValueError):
            discount = 0.0
        if discount < 0:
            discount = 0.0
        
        customer = None
        if customer_id:
            customer = get_object_or_404(User, pk=customer_id)
            
        from products.models import BranchStock
        from inventory.models.finance import CashFlow
        
        total_amount = 0
        products_to_dispense = []
        
        # Pre-check stock and calculate total.
        # Prefer batch-level FEFO availability when batch records exist,
        # but fall back to aggregate branch stock for legacy data.
        for item in items_data:
            product = get_object_or_404(Product, pk=item['product_id'])
            
            from utils.filters import validate_product_for_branch
            from django.core.exceptions import ValidationError
            try:
                validate_product_for_branch(product, active_branch)
            except ValidationError as e:
                return api_error(
                    ApiErrorCode.VALIDATION_ERROR,
                    e.message,
                    details={"product": product.name, "branch": active_branch.name}
                )

            branch_stock, _ = BranchStock.objects.get_or_create(
                product=product, branch=active_branch, defaults={'quantity': 0, 'reorder_level': 0}
            )

            requested_quantity = item['quantity']
            batch_allocations = []
            batch_queryset = Batch.objects.filter(
                product=product,
                branch=active_branch,
                is_active=True,
                quantity_remaining__gt=0,
                expiry_date__gte=timezone.now().date(),
            ).order_by('expiry_date', 'id')

            if batch_queryset.exists():
                remaining = requested_quantity
                for batch in batch_queryset:
                    if remaining <= 0:
                        break
                    available_qty = int(batch.quantity_remaining)
                    if available_qty <= 0:
                        continue
                    consume_qty = min(available_qty, remaining)
                    batch_allocations.append({
                        'batch': batch,
                        'quantity': consume_qty,
                    })
                    remaining -= consume_qty

                if remaining > 0:
                    return api_error(
                        ApiErrorCode.INSUFFICIENT_STOCK,
                        f"{product.name} does not have enough stock available by expiry date at {active_branch.name}.",
                        details={
                            "product_name": product.name,
                            "requested": requested_quantity,
                            "branch": active_branch.name,
                        },
                    )
                available = requested_quantity
            else:
                available = branch_stock.quantity
                if available < requested_quantity:
                    return api_error(
                        ApiErrorCode.INSUFFICIENT_STOCK,
                        f"{product.name} only has {available} units available at {active_branch.name}.",
                        details={
                            "product_name": product.name,
                            "available": available,
                            "requested": requested_quantity,
                            "branch": active_branch.name,
                        },
                    )

            price = product.wholesale_price if pricing_tier == 'WHOLESALE' and product.wholesale_price else product.price
            item_total = float(price) * requested_quantity
            total_amount += item_total
            products_to_dispense.append({
                'product': product,
                'branch_stock': branch_stock,
                'quantity': requested_quantity,
                'price': price,
                'item_total': item_total,
                'batch_allocations': batch_allocations,
            })

        # Cap discount at 50% for all non-admin staff
        if request.user.role != 'admin' and total_amount > 0:
            max_discount = total_amount * 0.50
            if discount > max_discount:
                return api_error(
                    ApiErrorCode.VALIDATION_ERROR,
                    f"You are not authorized to give a discount greater than 50% (Max allowed: KES {max_discount:.2f}).",
                    http_status=403,
                )

        # Clamp: discount cannot exceed the subtotal, and total cannot go below 0
        discount = min(discount, total_amount)
        total_amount = max(0.0, total_amount - discount)
        
        if payment_mode == 'CREDIT':
            if not customer:
                return api_error(
                    ApiErrorCode.VALIDATION_ERROR,
                    "A customer is required for credit sales.",
                )
            credit_limit = getattr(customer, 'credit_limit', float('inf'))
            if float(customer.credit_balance) + total_amount > float(credit_limit):
                customer_name = getattr(customer, 'username', None) or str(customer)
                return api_error(
                    ApiErrorCode.CREDIT_LIMIT_EXCEEDED,
                    f"{customer_name} has reached their credit limit.",
                    details={
                        "customer_name": customer_name,
                        "balance": float(customer.credit_balance),
                        "credit_limit": float(credit_limit),
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
            batch_allocations = p_data.get('batch_allocations', [])

            # Update overall branch stock
            previous_quantity = branch_stock.quantity
            branch_stock.quantity -= quantity
            branch_stock.save(update_fields=['quantity'])

            # Log the stock reduction
            from products.models import StockLog
            StockLog.objects.create(
                product=product,
                branch=active_branch,
                previous_quantity=previous_quantity,
                new_quantity=branch_stock.quantity,
                change_amount=-quantity,
                change_type="sale",
                reason=f"Sale",
                logged_by=request.user
            )

            if batch_allocations:
                for batch_info in batch_allocations:
                    batch = batch_info['batch']
                    batch_quantity = batch_info['quantity']
                    if batch_quantity <= 0:
                        continue
                    DispensationItem.objects.create(
                        dispensation=dispensation,
                        product=product,
                        quantity=batch_quantity,
                        price_per_unit=p_data['price'],
                        total_price=float(p_data['price']) * batch_quantity,
                        batch_number=batch.batch_number,
                        expiry_date=batch.expiry_date,
                    )
                    batch.quantity_remaining -= batch_quantity
                    batch.save(update_fields=['quantity_remaining'])
            else:
                DispensationItem.objects.create(
                    dispensation=dispensation,
                    product=product,
                    quantity=quantity,
                    price_per_unit=p_data['price'],
                    total_price=p_data['item_total'],
                    expiry_date=product.expiry_date,
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
    qs = Dispensation.objects.all()
    qs = filter_queryset_for_branch(request, qs, branch_field='branch')

    today_stats = qs.filter(dispensed_at__date=today).aggregate(
        total_sales=Count('id'),
        total_revenue=Sum('total_amount'),
        total_discounts=Sum('discount'),
        otc_sales=Count('id', filter=Q(sale_type='otc')),
        prescription_sales=Count('id', filter=Q(sale_type='prescription'))
    )

    monthly_stats = qs.filter(dispensed_at__date__gte=thirty_days_ago).aggregate(
        total_sales=Count('id'),
        total_revenue=Sum('total_amount'),
        total_discounts=Sum('discount'),
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
    expired_qs = filter_queryset_for_branch(request, expired_qs, branch_field='branch')
        
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