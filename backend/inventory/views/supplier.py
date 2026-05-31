from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from inventory.models.supplier import Supplier, SupplierCreditTransaction
from inventory.models.stock_intake import StockIntake
from inventory.serializers.supplier import SupplierSerializer

class SupplierViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing suppliers.
    """
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'contact_person', 'email', 'phone']

    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        """
        Returns the full credit transaction history and past purchases.
        """
        supplier = self.get_object()
        
        # Fetch debt transactions
        debt_txs = SupplierCreditTransaction.objects.filter(supplier=supplier).order_by('-timestamp')
        debt_history = [{
            'id': tx.id,
            'type': tx.transaction_type,
            'amount': str(tx.amount),
            'balance_after': str(tx.balance_after),
            'description': tx.description,
            'invoice_number': tx.invoice_number,
            'timestamp': tx.timestamp.isoformat(),
            'cashier': tx.created_by.username if tx.created_by else None,
        } for tx in debt_txs]

        # Fetch purchase history (StockIntakes)
        intakes = StockIntake.objects.filter(supplier=supplier).order_by('-received_date')
        purchase_history = [{
            'id': intake.id,
            'product_name': intake.product.name,
            'quantity': intake.quantity_received,
            'unit_cost': str(intake.unit_cost),
            'total_cost': str(intake.total_cost),
            'payment_status': intake.payment_status,
            'invoice_number': intake.invoice_number,
            'timestamp': intake.received_date.isoformat(),
            'branch': intake.branch.name if intake.branch else None,
            'received_by': intake.received_by.username if intake.received_by else None,
        } for intake in intakes]

        return Response({
            'debt_transactions': debt_history,
            'purchase_history': purchase_history
        })

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """
        Record a payment to the supplier, reducing the balance owed.
        """
        supplier = self.get_object()
        amount_str = request.data.get('amount')
        payment_mode = request.data.get('payment_mode', 'CASH')
        invoice_number = request.data.get('invoice_number', '')
        notes = request.data.get('notes', '')

        try:
            amount = float(amount_str)
            if amount <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'detail': 'Valid positive amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Lock the supplier record
            locked_supplier = Supplier.objects.select_for_update().get(id=supplier.id)
            
            # Deduct payment from balance (can go negative if overpaid)
            locked_supplier.balance -= amount
            locked_supplier.save()

            # Create transaction record
            tx = SupplierCreditTransaction.objects.create(
                supplier=locked_supplier,
                transaction_type='PAYMENT',
                amount=amount,
                balance_after=locked_supplier.balance,
                description=f"Payment via {payment_mode}. {notes}",
                invoice_number=invoice_number,
                created_by=request.user
            )

            receipt = {
                'transaction_id': tx.id,
                'supplier_name': locked_supplier.name,
                'amount_paid': str(tx.amount),
                'remaining_balance': str(locked_supplier.balance),
                'payment_mode': payment_mode,
                'invoice_number': invoice_number,
                'timestamp': tx.timestamp.isoformat(),
                'cashier': request.user.username,
            }

        return Response({'detail': 'Payment recorded successfully', 'receipt': receipt, 'new_balance': str(locked_supplier.balance)})
