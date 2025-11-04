from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin
from django.db.models import Q
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

        # Regular users can only see their own requests
        if not (user.is_pharmacist or user.is_superuser):
            queryset = queryset.filter(requested_by=user)
            
        return queryset.select_related('product', 'requested_by', 'approved_by')

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not (request.user.is_pharmacist or request.user.is_superuser):
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
        if not (request.user.is_pharmacist or request.user.is_superuser):
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
        if not (request.user.is_pharmacist or request.user.is_superuser):
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

        # Update product stock quantity
        product = restock_request.product
        previous_quantity = product.stock_quantity
        product.stock_quantity += restock_request.requested_quantity
        product.save()

        # Create stock log
        from products.models import StockLog
        StockLog.objects.create(
            product=product,
            previous_quantity=previous_quantity,
            new_quantity=product.stock_quantity,
            change_amount=restock_request.requested_quantity,
            change_type='restock',
            reason=f'Restock request #{restock_request.id} fulfilled',
            logged_by=request.user
        )

        serializer = self.get_serializer(restock_request)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        restock_request = self.get_object()
        
        # Only the requester, pharmacists, or admins can cancel
        if (restock_request.requested_by != request.user and 
            not request.user.is_pharmacist and 
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