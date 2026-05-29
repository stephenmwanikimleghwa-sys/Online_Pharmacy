from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin
from ..models import InterBranchTransfer
from ..serializers.transfer import InterBranchTransferSerializer

class InterBranchTransferViewSet(viewsets.ModelViewSet):
    queryset = InterBranchTransfer.objects.all()
    serializer_class = InterBranchTransferSerializer
    permission_classes = [IsPharmacistOrAdmin]

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'pending':
            return Response({'error': 'Can only approve pending transfers'}, status=status.HTTP_400_BAD_REQUEST)
            
        transfer.status = 'approved'
        transfer.approved_by = request.user
        transfer.save()
        return Response(self.get_serializer(transfer).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'approved':
            return Response({'error': 'Can only complete approved transfers'}, status=status.HTTP_400_BAD_REQUEST)
            
        transfer.status = 'completed'
        transfer.save()
        return Response(self.get_serializer(transfer).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status not in ['pending', 'approved']:
            return Response({'error': 'Cannot reject this transfer'}, status=status.HTTP_400_BAD_REQUEST)
            
        transfer.status = 'rejected'
        transfer.save()
        return Response(self.get_serializer(transfer).data)
