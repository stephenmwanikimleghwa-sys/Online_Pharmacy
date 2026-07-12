"""
Branch API views — CRUD and summary for admin users.
Non-admin users can only view their own branch.
"""
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Q, F
from django.utils import timezone
from datetime import timedelta

from users.models import Branch
from users.serializers import BranchSerializer
from config.api_responses import (
    api_not_found,
    api_permission_denied,
    api_success,
    api_validation_error,
)
from products.models import Product
from inventory.models import InterBranchTransfer

class BranchListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/users/branches/       — List all branches (admin sees all; staff sees their own)
    POST /api/users/branches/       — Create a new branch (admin only)
    """
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Branch.objects.filter(is_active=True).select_related('pharmacy')
        if user.is_superuser or user.role == 'admin':
            return qs.all()
        # Non-admin staff can only see their own branch
        if user.branch:
            return qs.filter(pk=user.branch.pk)
        return qs.none()

    def perform_create(self, serializer):
        """Only admins/superusers can create branches."""
        user = self.request.user
        if not (user.is_superuser or user.role == 'admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can create branches.")
        serializer.save()


class BranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/users/branches/<id>/  — Branch detail
    PATCH  /api/users/branches/<id>/  — Update branch (admin only)
    DELETE /api/users/branches/<id>/  — Deactivate branch (admin only, soft delete)
    """
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]
    queryset = Branch.objects.select_related('pharmacy').all()
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: mark as inactive rather than hard delete."""
        branch = self.get_object()
        if branch.is_headquarters:
            return Response(
                {'detail': 'Cannot deactivate the headquarters branch.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        branch.is_active = False
        branch.save(update_fields=['is_active'])
        return Response({'detail': 'Branch deactivated.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def branch_summary(request, pk):
    """
    GET /api/users/branches/<id>/summary/
    Returns key statistics for a branch:
    - total sales today & this month
    - active staff count
    - low-stock product count
    """
    try:
        branch = Branch.objects.get(pk=pk)
    except Branch.DoesNotExist:
        return Response({'detail': 'Branch not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Permission: admin sees any branch; staff only see their own
    user = request.user
    if not (user.is_superuser or user.role == 'admin'):
        if not user.branch or user.branch.pk != branch.pk:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    today = timezone.now().date()
    month_start = today.replace(day=1)

    # Sales stats
    dispensations = branch.dispensations.all()
    sales_today = dispensations.filter(
        dispensed_at__date=today
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    sales_this_month = dispensations.filter(
        dispensed_at__date__gte=month_start
    ).aggregate(total=Sum('total_amount'))['total'] or 0

    sales_count_today = dispensations.filter(dispensed_at__date=today).count()

    # Staff
    active_staff = branch.users.filter(is_active=True).count()

    # Pending restock requests
    pending_restock = branch.restock_requests.filter(status='pending').count()

    return Response({
        'branch_id': branch.pk,
        'branch_name': branch.name,
        'is_headquarters': branch.is_headquarters,
        'sales_today': float(sales_today),
        'sales_this_month': float(sales_this_month),
        'transactions_today': sales_count_today,
        'active_staff': active_staff,
        'pending_restock_requests': pending_restock,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_branches_summary(request):
    """
    GET /api/users/branches/summary/
    Aggregated summary across ALL branches for the admin dashboard.
    Admin only.
    """
    user = request.user
    if not (user.is_superuser or user.role == 'admin'):
        return api_permission_denied("Admin access is required for this report.")

    today = timezone.now().date()
    month_start = today.replace(day=1)

    branches = Branch.objects.filter(is_active=True).select_related('pharmacy')
    result = []

    for branch in branches:
        dispensations = branch.dispensations.all()
        sales_today = dispensations.filter(
            dispensed_at__date=today
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        sales_month = dispensations.filter(
            dispensed_at__date__gte=month_start
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        result.append({
            'id': branch.pk,
            'name': branch.name,
            'is_headquarters': branch.is_headquarters,
            'is_active': branch.is_active,
            'active_staff': branch.users.filter(is_active=True).count(),
            'sales_today': float(sales_today),
            'sales_this_month': float(sales_month),
            'transactions_today': dispensations.filter(dispensed_at__date=today).count(),
            'pending_restock': branch.restock_requests.filter(status='pending').count(),
            'total_products': branch.branch_stocks.count(),
            'low_stock_items': branch.branch_stocks.filter(quantity__lte=F('reorder_level'), quantity__gt=0).count(),
            'pending_transfers': branch.transfers_out.filter(status='PENDING').count() + branch.transfers_in.filter(status='PENDING').count(),
        })

    # Global Dashboard Metrics
    sixty_days_from_now = today + timedelta(days=60)
    expiring_products = Product.objects.filter(expiry_date__lte=sixty_days_from_now, expiry_date__gte=today).count()
    from django.contrib.auth import get_user_model
    User = get_user_model()
    pending_credit_customers = User.objects.filter(is_credit_customer=True, credit_balance__gt=0).count()

    # Totals row
    totals = {
        'id': 'all',
        'name': 'All Branches',
        'is_headquarters': False,
        'is_active': True,
        'active_staff': sum(b['active_staff'] for b in result),
        'sales_today': sum(b['sales_today'] for b in result),
        'sales_this_month': sum(b['sales_this_month'] for b in result),
        'transactions_today': sum(b['transactions_today'] for b in result),
        'pending_restock': sum(b['pending_restock'] for b in result),
        'total_products': sum(b['total_products'] for b in result),
        'low_stock_items': sum(b['low_stock_items'] for b in result),
        'pending_transfers': sum(b['pending_transfers'] for b in result),
        'expiring_products': expiring_products,
        'pending_credit_customers': pending_credit_customers,
    }

    return Response({'branches': result, 'totals': totals})
