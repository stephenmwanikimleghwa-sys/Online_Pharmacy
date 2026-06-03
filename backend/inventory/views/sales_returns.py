from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from config.api_responses import api_not_found, api_success, api_validation_error
from ..models.dispensing import SaleReturn, SaleReturnItem, Dispensation
from products.models import BranchStock, StockLog
from ..serializers.sales_returns import SaleReturnSerializer, SaleReturnItemSerializer

class SaleReturnViewSet(viewsets.ModelViewSet):
    queryset = SaleReturn.objects.all()
    serializer_class = SaleReturnSerializer

    def get_queryset(self):
        user = self.request.user
        qs = (
            SaleReturn.objects
            .select_related('initiated_by', 'approved_by')
            .prefetch_related('items', 'items__dispensation_item', 'items__dispensation_item__product')
            .all()
        )
        if user.role not in ['admin', 'manager', 'auditor']:
            qs = qs.filter(branch=user.branch)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            initiated_by=self.request.user, 
            branch=self.request.user.branch
        )

    @action(detail=False, methods=['post'])
    def process_return(self, request):
        """
        Creates a SaleReturn and corresponding SaleReturnItems.
        Expected payload:
        {
            "dispensation_id": 1,
            "reason": "Customer changed mind",
            "items": [
                {
                    "dispensation_item_id": 5,
                    "quantity": 1,
                    "refund_amount": 100.00,
                    "condition": "sellable"
                }
            ]
        }
        """
        data = request.data
        dispensation_id = data.get('dispensation_id')
        items_data = data.get('items', [])
        
        try:
            dispensation = Dispensation.objects.get(id=dispensation_id)
        except Dispensation.DoesNotExist:
            return api_not_found(
                "Dispensation not found.",
                details={"dispensation_id": dispensation_id},
            )

        with transaction.atomic():
            total_refund = sum(float(item.get('refund_amount', 0)) for item in items_data)
            
            sale_return = SaleReturn.objects.create(
                dispensation=dispensation,
                branch=dispensation.branch,
                reason=data.get('reason', ''),
                total_refund=total_refund,
                initiated_by=request.user,
                status='pending'
            )
            
            for item in items_data:
                SaleReturnItem.objects.create(
                    return_record=sale_return,
                    dispensation_item_id=item['dispensation_item_id'],
                    quantity=item['quantity'],
                    refund_amount=item['refund_amount'],
                    condition=item.get('condition', 'sellable')
                )
                
        serializer = self.get_serializer(sale_return)
        return api_success(
            "Return initiated and pending approval.",
            data=serializer.data,
            extra=serializer.data,
            http_status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        sale_return = self.get_object()
        
        if sale_return.status != 'pending':
            return api_validation_error(
                f"Cannot approve return with status {sale_return.status}.",
                details={"status": sale_return.status},
            )
            
        with transaction.atomic():
            sale_return.status = 'approved'
            sale_return.approved_by = request.user
            sale_return.save()
            
            # Process stock updates
            for item in sale_return.items.all():
                if item.condition == 'sellable':
                    branch_stock, _ = BranchStock.objects.get_or_create(
                        product=item.dispensation_item.product,
                        branch=sale_return.branch,
                        defaults={'quantity': 0}
                    )
                    
                    prev_qty = branch_stock.quantity
                    new_qty = prev_qty + item.quantity
                    
                    StockLog.objects.create(
                        product=item.dispensation_item.product,
                        branch=sale_return.branch,
                        previous_quantity=prev_qty,
                        new_quantity=new_qty,
                        change_amount=item.quantity,
                        change_type='return_in',
                        reason=f"Approved Return #{sale_return.id}: {sale_return.reason}",
                        logged_by=request.user
                    )
                    
                    branch_stock.quantity = new_qty
                    branch_stock.save()

        return api_success("Return approved and stock updated where applicable.")

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        sale_return = self.get_object()
        
        if sale_return.status != 'pending':
            return api_validation_error("Only pending returns can be rejected.")

        sale_return.status = 'rejected'
        sale_return.approved_by = request.user
        sale_return.save()

        return api_success("Return rejected successfully.")
