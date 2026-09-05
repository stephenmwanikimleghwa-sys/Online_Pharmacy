from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin, IsAuditorOrAdmin, IsAdminUser
from users.active_branch import get_active_branch, require_active_branch, resolve_request_branch, filter_queryset_for_branch
from users.utils import log_activity
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
from products.models import Product, BranchStock, StockLog, resolve_unit_price

from ..serializers.dispensing import (
    PrescriptionSerializer,
    PrescriptionItemSerializer,
    DispensationSerializer,
    DispensationItemSerializer
)
from config.api_responses import ApiErrorCode, api_error, api_success
from utils.filters import validate_product_for_branch
from django.core.exceptions import ValidationError as DjangoValidationError

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
        if self.action == 'void_sale':
            return [IsAdminUser()]
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
        Admin-only: reverse a sale — restore stock, reverse cash/credit, mark voided.
        Idempotent when notes already contain [VOIDED].
        """
        dispensation = self.get_object()

        if dispensation.notes and '[VOIDED]' in dispensation.notes:
            return api_success(
                "Sale was already voided.",
                data=self.get_serializer(dispensation).data,
                extra={"duplicate": True},
            )

        blocking_returns = dispensation.returns.filter(
            status__in=('pending', 'approved')
        ).exists()
        if blocking_returns:
            return api_error(
                ApiErrorCode.VALIDATION_ERROR,
                "Cannot void a sale that has a pending or approved return. "
                "Reject the return first, or leave the approved return as the reversal.",
                http_status=400,
            )

        with transaction.atomic():
            branch = dispensation.branch
            items = list(dispensation.items.select_related('product'))

            for item in items:
                if not branch:
                    break
                branch_stock, _ = BranchStock.objects.select_for_update().get_or_create(
                    product=item.product,
                    branch=branch,
                    defaults={'quantity': 0},
                )
                prev_qty = branch_stock.quantity
                new_qty = prev_qty + item.quantity
                StockLog.objects.create(
                    product=item.product,
                    branch=branch,
                    previous_quantity=prev_qty,
                    new_quantity=new_qty,
                    change_amount=item.quantity,
                    change_type='adjustment',
                    reason=f'Void sale #{dispensation.id}',
                    logged_by=request.user,
                )
                branch_stock.quantity = new_qty
                branch_stock.save(update_fields=['quantity'])

                if item.batch_number:
                    batch = (
                        Batch.objects.select_for_update()
                        .filter(
                            product=item.product,
                            branch=branch,
                            batch_number=item.batch_number,
                        )
                        .first()
                    )
                    if batch is not None:
                        batch.quantity_remaining = (batch.quantity_remaining or 0) + item.quantity
                        batch.save(update_fields=['quantity_remaining'])

            total_amount = float(dispensation.total_amount or 0)
            if dispensation.payment_mode == 'CREDIT' and dispensation.customer_id:
                from users.models import CustomerDebtTransaction

                customer = dispensation.customer
                customer.credit_balance = float(customer.credit_balance) - total_amount
                customer.save(update_fields=['credit_balance'])
                CustomerDebtTransaction.objects.create(
                    customer=customer,
                    transaction_type='ADJUSTMENT',
                    amount=-total_amount,
                    balance_after=customer.credit_balance,
                    description=f"Void Dispensation #{dispensation.id}",
                    branch=branch,
                    created_by=request.user,
                )
            else:
                from inventory.models.finance import CashFlow

                CashFlow.objects.create(
                    netflow=-total_amount,
                    paymentmode=dispensation.payment_mode or 'CASH',
                    explanation=f"Void Dispensation #{dispensation.id}",
                    branch=branch,
                    timestamp=timezone.now(),
                )

            stamp = timezone.now().strftime('%Y-%m-%d %H:%M')
            void_note = f"[VOIDED] by {request.user.username} at {stamp}"
            dispensation.notes = (
                f"{dispensation.notes.strip()}\n{void_note}".strip()
                if dispensation.notes
                else void_note
            )
            dispensation.save(update_fields=['notes'])

            log_activity(
                user=request.user,
                event_type='SALE_VOIDED',
                branch=branch,
                details_dict={
                    'dispensation_id': dispensation.id,
                    'total_amount': total_amount,
                    'items_count': len(items),
                    'payment_mode': dispensation.payment_mode,
                    'customer_id': dispensation.customer_id,
                },
            )

        payload = self.get_serializer(dispensation).data
        return api_success(
            f"Sale #{dispensation.id} voided. Stock restored and financials reversed.",
            data=payload,
            extra={"dispensation": payload},
        )

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

    # Idempotency: same client_uuid as an offline-queued sale (or a timed-out
    # online retry) must not create a second dispensation / double stock hit.
    client_uuid = request.data.get("client_uuid")
    if client_uuid:
        from inventory.models.sync import SyncOperation, SyncOpStatus, SyncOpType
        from inventory.serializers.dispensing import DispensationSerializer

        existing = SyncOperation.objects.filter(client_uuid=client_uuid).first()
        if existing is not None and existing.result_ref:
            try:
                existing_disp = (
                    Dispensation.objects.select_related("branch", "dispensed_by", "customer")
                    .prefetch_related("items__product")
                    .get(pk=int(existing.result_ref))
                )
                payload = DispensationSerializer(existing_disp).data
                return api_success(
                    "Sale already recorded (idempotent replay).",
                    data=payload,
                    extra={"dispensation": payload, "duplicate": True},
                )
            except (Dispensation.DoesNotExist, ValueError, TypeError):
                pass

    with transaction.atomic():
        items_data = request.data.get('items', [])
        payment_mode = request.data.get('payment_mode', 'CASH')
        pricing_tier = request.data.get('pricing_tier', 'RETAIL')
        customer_id = request.data.get('customer_id')
        discount = request.data.get('discount', 0)
        
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
            try:
                validate_product_for_branch(product, active_branch)
            except DjangoValidationError as exc:
                msg = "; ".join(getattr(exc, "messages", None) or [str(exc)])
                return api_error(
                    ApiErrorCode.VALIDATION_ERROR,
                    msg,
                    details={"product_id": product.id, "code": getattr(exc, "code", None)},
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

            price = resolve_unit_price(product, pricing_tier)
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

        total_amount -= float(discount)
        
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
            batch_allocations = p_data.get('batch_allocations', [])

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
        # Re-fetch with items so receipt/API clients always get line details
        dispensation = (
            Dispensation.objects.select_related("branch", "dispensed_by", "customer")
            .prefetch_related("items__product")
            .get(pk=dispensation.pk)
        )
        payload = DispensationSerializer(dispensation).data

        # Record idempotency ledger so a timed-out client that later syncs the
        # same client_uuid does not apply the sale twice.
        if client_uuid:
            from inventory.models.sync import SyncOperation, SyncOpStatus, SyncOpType

            SyncOperation.objects.update_or_create(
                client_uuid=client_uuid,
                defaults={
                    "op_type": SyncOpType.SALE,
                    "status": SyncOpStatus.APPLIED,
                    "branch": active_branch,
                    "user": request.user,
                    "payload": {
                        "items": items_data,
                        "payment_mode": payment_mode,
                        "pricing_tier": pricing_tier,
                        "discount": discount,
                        "source": "online_otc",
                    },
                    "result_ref": str(dispensation.id),
                    "had_discrepancy": False,
                },
            )

        return api_success(
            f"{item_count} item(s) sold. Total: KES {total_amount:.2f}.",
            data=payload,
            extra={"dispensation": payload},
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