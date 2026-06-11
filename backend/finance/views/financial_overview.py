from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta

from inventory.models import Dispensation, Supplier
from users.models import User, RoleChoices
from finance.models import LegacyLedger

class FinancialsPermission(permissions.BasePermission):
    """
    Custom permission to only allow users with can_view_financials=True or admins/auditors.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'can_view_financials', False):
            return True
        if user.role in [RoleChoices.ADMIN, RoleChoices.AUDITOR]:
            return True
        return False

class FinancialOverviewViewSet(viewsets.ViewSet):
    """
    ViewSet for Financial Overview dashboard.
    """
    permission_classes = [FinancialsPermission]

    @action(detail=False, methods=['get'])
    def cash_flow(self, request):
        """
        Returns daily income over the past 30 days (based on Dispensations and legacy Orders).
        """
        from orders.models import Order
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        branch_id = request.query_params.get('branch_id')
        disp_query = Q(dispensed_at__range=(start_date, end_date))
        order_query = Q(created_at__range=(start_date, end_date), status__in=['delivered', 'completed'])
        
        if branch_id:
            disp_query &= Q(branch_id=branch_id)
            order_query &= Q(branch_id=branch_id)
            
        dispensations = Dispensation.objects.filter(disp_query)
        orders = Order.objects.filter(order_query)
        
        # Aggregate by day
        # For simplicity, we process in memory for SQLite compatibility. 
        # In a real heavy production DB, TruncDate would be used.
        daily_totals = {}
        for d in dispensations:
            day_str = d.dispensed_at.strftime('%Y-%m-%d')
            amount = float(d.total_amount)
            if day_str not in daily_totals:
                daily_totals[day_str] = 0
            daily_totals[day_str] += amount
            
        for o in orders:
            day_str = o.created_at.strftime('%Y-%m-%d')
            amount = float(o.total_amount)
            if day_str not in daily_totals:
                daily_totals[day_str] = 0
            daily_totals[day_str] += amount

        result = [{"date": k, "income": v} for k, v in sorted(daily_totals.items())]
        
        return Response({"cash_flow": result})

    @action(detail=False, methods=['get'])
    def account_balances(self, request):
        """
        Returns total sums of dispensations and legacy orders grouped by payment mode.
        """
        from orders.models import Order
        branch_id = request.query_params.get('branch_id')
        disp_query = Q()
        order_query = Q(status__in=['delivered', 'completed'])
        
        if branch_id:
            disp_query &= Q(branch_id=branch_id)
            order_query &= Q(branch_id=branch_id)
            
        # Group by payment mode for dispensations
        disp_balances = Dispensation.objects.filter(disp_query).values('payment_mode').annotate(total=Sum('total_amount'))
        
        totals_by_mode = {}
        for item in disp_balances:
            mode = item['payment_mode'] or 'UNKNOWN'
            totals_by_mode[mode] = totals_by_mode.get(mode, 0) + float(item['total'] or 0)
            
        # Group legacy orders (method is in related Payment object, but for simplicity we can just check the first payment or default)
        orders = Order.objects.filter(order_query).prefetch_related('payment')
        for o in orders:
            mode = 'UNKNOWN'
            if getattr(o, 'payment', None):
                mode = str(o.payment.method).upper()
            totals_by_mode[mode] = totals_by_mode.get(mode, 0) + float(o.total_amount)
        
        formatted_balances = {k: str(v) for k, v in totals_by_mode.items()}
        
        return Response({"account_balances": formatted_balances})

    @action(detail=False, methods=['get'])
    def debtor_creditor_summary(self, request):
        """
        Returns total outstanding Debtors (owed to us) and Creditors (owed by us).
        """
        # Debtors: Customers with positive credit_balance
        debtors = User.objects.filter(role=RoleChoices.CUSTOMER, credit_balance__gt=0).aggregate(total=Sum('credit_balance'))
        total_debtors = debtors['total'] or 0
        
        # Customer Store Credit (negative credit_balance)
        customer_credit = User.objects.filter(role=RoleChoices.CUSTOMER, credit_balance__lt=0).aggregate(total=Sum('credit_balance'))
        total_customer_credit = abs(customer_credit['total'] or 0)

        # Creditors: Suppliers with positive balance
        creditors = Supplier.objects.filter(balance__gt=0).aggregate(total=Sum('balance'))
        total_creditors = creditors['total'] or 0
        
        # Supplier Store Credit (negative balance)
        supplier_credit = Supplier.objects.filter(balance__lt=0).aggregate(total=Sum('balance'))
        total_supplier_credit = abs(supplier_credit['total'] or 0)

        return Response({
            "debtors_total": str(total_debtors),
            "customer_store_credit_total": str(total_customer_credit),
            "creditors_total": str(total_creditors),
            "supplier_store_credit_total": str(total_supplier_credit),
        })

    @action(detail=False, methods=['get'])
    def legacy_ledger(self, request):
        """
        Returns the legacy ledger entries.
        """
        entries = LegacyLedger.objects.all().order_by('-transaction_date')[:100] # Limit for performance
        data = [{
            "id": e.id,
            "transaction_date": e.transaction_date.isoformat(),
            "reference_number": e.reference_number,
            "description": e.description,
            "amount": str(e.amount),
            "transaction_type": e.transaction_type,
            "payment_mode": e.payment_mode
        } for e in entries]
        
        return Response({"legacy_ledger": data})
