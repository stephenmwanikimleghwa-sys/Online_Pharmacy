from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin
from users.models import RoleChoices
from django.db.models import Q
from users.utils import log_activity
from ..models import RestockRequest
from ..serializers.restock import RestockRequestSerializer

class RestockRequestViewSet(viewsets.ModelViewSet):
    queryset = RestockRequest.objects.all()
    serializer_class = RestockRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = RestockRequest.objects.all()

        # Filter by status if provided
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)

        # Filter by product if provided
        product_id = self.request.query_params.get('product_id', None)
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        # Branch scoping
        is_admin = user.is_superuser or user.role == 'admin'
        branch_param = self.request.query_params.get('branch')
        if is_admin and branch_param and branch_param != 'all':
            queryset = queryset.filter(branch_id=branch_param)
        elif not is_admin and user.branch:
            queryset = queryset.filter(branch=user.branch)
        elif not is_admin:
            # Non-branch-assigned staff: only their own requests
            queryset = queryset.filter(requested_by=user)

        return queryset.select_related('product', 'requested_by', 'approved_by', 'branch')

    def perform_create(self, serializer):
        branch = self.request.user.branch
        branch_id = self.request.data.get('branch_id')
        if branch_id:
            from users.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                pass
        serializer.save(requested_by=self.request.user, branch=branch)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not (request.user.role == RoleChoices.PHARMACIST or request.user.is_superuser):
            return Response(
                {"detail": "Only pharmacists and admins can approve requests"},
                status=status.HTTP_403_FORBIDDEN
            )

        restock_request = self.get_object()
        
        if restock_request.status != 'pending':
            return Response(
                {"detail": f"Cannot approve request in {restock_request.status} status"},
                status=status.HTTP_400_BAD_REQUEST
            )

        restock_request.status = 'approved'
        restock_request.approved_by = request.user
        restock_request.save()

        serializer = self.get_serializer(restock_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not (request.user.role == RoleChoices.PHARMACIST or request.user.is_superuser):
            return Response(
                {"detail": "Only pharmacists and admins can reject requests"},
                status=status.HTTP_403_FORBIDDEN
            )

        restock_request = self.get_object()
        
        if restock_request.status != 'pending':
            return Response(
                {"detail": f"Cannot reject request in {restock_request.status} status"},
                status=status.HTTP_400_BAD_REQUEST
            )

        restock_request.status = 'rejected'
        restock_request.approved_by = request.user
        restock_request.notes = request.data.get('notes', restock_request.notes)
        restock_request.save()

        serializer = self.get_serializer(restock_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        if not (request.user.role == RoleChoices.PHARMACIST or request.user.is_superuser):
            return Response(
                {"detail": "Only pharmacists and admins can complete requests"},
                status=status.HTTP_403_FORBIDDEN
            )

        restock_request = self.get_object()
        
        if restock_request.status != 'approved':
            return Response(
                {"detail": "Only approved requests can be marked as completed"},
                status=status.HTTP_400_BAD_REQUEST
            )

        restock_request.status = 'completed'
        restock_request.save()

        # Update branch stock quantity
        from products.models import BranchStock, StockLog
        branch = restock_request.branch or request.user.branch
        if not branch:
            return Response(
                {"detail": "Cannot complete restock request without a branch."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        branch_stock, _ = BranchStock.objects.get_or_create(
            product=restock_request.product,
            branch=branch,
            defaults={'quantity': 0}
        )
        previous_quantity = branch_stock.quantity
        branch_stock.quantity += restock_request.requested_quantity
        branch_stock.save(update_fields=['quantity'])

        # Create stock log
        StockLog.objects.create(
            product=restock_request.product,
            branch=branch,
            previous_quantity=previous_quantity,
            new_quantity=branch_stock.quantity,
            change_amount=restock_request.requested_quantity,
            change_type='restock',
            reason=f'Restock request #{restock_request.id} fulfilled',
            logged_by=request.user
        )

        log_activity(
            user=request.user,
            event_type='PRODUCT_RESTOCKED',
            branch=branch,
            ip_address=request.META.get('REMOTE_ADDR'),
            details_dict={
                'product_id': restock_request.product.id,
                'product_name': restock_request.product.name,
                'branch_name': branch.name,
                'quantity_added': restock_request.requested_quantity,
                'restock_request_id': restock_request.id,
                'previous_quantity': previous_quantity,
                'new_quantity': branch_stock.quantity,
                'source': 'restock_request_completion'
            }
        )

        serializer = self.get_serializer(restock_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        restock_request = self.get_object()
        
        # Only the requester, pharmacists, or admins can cancel
        if (restock_request.requested_by != request.user and 
            not (request.user.role == RoleChoices.PHARMACIST) and 
            not request.user.is_superuser):
            return Response(
                {"detail": "You don't have permission to cancel this request"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if restock_request.status not in ['pending', 'approved']:
            return Response(
                {"detail": f"Cannot cancel request in {restock_request.status} status"},
                status=status.HTTP_400_BAD_REQUEST
            )

        restock_request.status = 'cancelled'
        restock_request.notes = request.data.get('notes', restock_request.notes)
        restock_request.save()

        serializer = self.get_serializer(restock_request)
        return Response(serializer.data)