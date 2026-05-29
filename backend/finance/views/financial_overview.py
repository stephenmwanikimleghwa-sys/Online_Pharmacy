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
        Returns daily income over the past 30 days (based on Dispensations).
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        branch_id = request.query_params.get('branch_id')
        query = Q(dispensed_at__range=(start_date, end_date))
        if branch_id:
            query &= Q(branch_id=branch_id)
            
        dispensations = Dispensation.objects.filter(query)
        
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

        result = [{"date": k, "income": v} for k, v in sorted(daily_totals.items())]
        
        return Response({"cash_flow": result})

    @action(detail=False, methods=['get'])
    def account_balances(self, request):
        """
        Returns total sums of dispensations grouped by payment mode.
        """
        branch_id = request.query_params.get('branch_id')
        query = Q()
        if branch_id:
            query &= Q(branch_id=branch_id)
            
        # Group by payment mode
        balances = Dispensation.objects.filter(query).values('payment_mode').annotate(total=Sum('total_amount'))
        
        formatted_balances = {item['payment_mode']: str(item['total'] or 0) for item in balances}
        
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
