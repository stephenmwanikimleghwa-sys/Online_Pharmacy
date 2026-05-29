from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Prefetch

from users.models import User, CustomerDebtTransaction, RoleChoices
from inventory.models import Dispensation

class CustomerViewSet(viewsets.GenericViewSet):
    """
    ViewSet for managing credit customers and their debt.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # We assume customers are users with role='customer' OR is_credit_customer=True
        return User.objects.filter(role=RoleChoices.CUSTOMER).order_by('first_name', 'last_name')

    def list(self, request):
        """
        List all customers with their basic details and balance.
        """
        customers = self.get_queryset()
        data = []
        for c in customers:
            data.append({
                'id': c.id,
                'name': c.full_name or c.username,
                'phone': getattr(c, 'phone', ''), # Might not exist directly, assume it's in address/username for now or handled differently
                'address': c.address or '',
                'credit_balance': str(c.credit_balance),
            })
        return Response(data)

    def retrieve(self, request, pk=None):
        customer = self.get_object()
        return Response({
            'id': customer.id,
            'name': customer.full_name or customer.username,
            'address': customer.address or '',
            'credit_balance': str(customer.credit_balance),
        })

    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        """
        Returns the full debt transaction history and past purchases (Dispensations).
        """
        customer = self.get_object()
        
        # Fetch debt transactions
        debt_txs = CustomerDebtTransaction.objects.filter(customer=customer).order_by('-timestamp')
        debt_history = [{
            'id': tx.id,
            'type': tx.transaction_type,
            'amount': str(tx.amount),
            'balance_after': str(tx.balance_after),
            'description': tx.description,
            'timestamp': tx.timestamp.isoformat(),
            'branch': tx.branch.name if tx.branch else None,
            'cashier': tx.created_by.username if tx.created_by else None,
        } for tx in debt_txs]

        # Fetch dispensations
        dispensations = Dispensation.objects.filter(customer=customer).order_by('-dispensed_at')
        purchase_history = [{
            'id': disp.id,
            'total_amount': str(disp.total_amount),
            'payment_mode': disp.payment_mode,
            'timestamp': disp.dispensed_at.isoformat(),
            'branch': disp.branch.name if disp.branch else None,
            'cashier': disp.dispensed_by.username if disp.dispensed_by else None,
        } for disp in dispensations]

        return Response({
            'debt_transactions': debt_history,
            'purchase_history': purchase_history
        })

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """
        Record a payment from the customer, reducing their credit balance.
        """
        customer = self.get_object()
        amount_str = request.data.get('amount')
        payment_mode = request.data.get('payment_mode', 'CASH')
        notes = request.data.get('notes', '')

        try:
            amount = float(amount_str)
            if amount <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'detail': 'Valid positive amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Lock the customer record
            locked_customer = User.objects.select_for_update().get(id=customer.id)
            
            # Deduct payment from balance (can go negative if overpaid)
            locked_customer.credit_balance -= amount
            locked_customer.save()

            # Create transaction record
            tx = CustomerDebtTransaction.objects.create(
                customer=locked_customer,
                transaction_type='PAYMENT',
                amount=amount,
                balance_after=locked_customer.credit_balance,
                description=f"Payment received via {payment_mode}. {notes}",
                branch=request.user.pharmacy.branches.first() if hasattr(request.user, 'pharmacy') and request.user.pharmacy else None, # Simplified branch fallback
                created_by=request.user
            )

            # Retrieve branch name for receipt
            branch_name = "Main Branch"
            if tx.branch:
                branch_name = tx.branch.name
            elif request.user.pharmacy:
                branch_name = request.user.pharmacy.name

            receipt = {
                'transaction_id': tx.id,
                'customer_name': locked_customer.full_name or locked_customer.username,
                'amount_paid': str(tx.amount),
                'remaining_balance': str(locked_customer.credit_balance),
                'payment_mode': payment_mode,
                'timestamp': tx.timestamp.isoformat(),
                'cashier': request.user.username,
                'branch_name': branch_name,
            }

        return Response({'detail': 'Payment recorded successfully', 'receipt': receipt, 'new_balance': str(locked_customer.credit_balance)})
