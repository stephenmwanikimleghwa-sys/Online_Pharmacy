from rest_framework import viewsets, permissions
from ..models import StaffActivityLog
from ..serializers import StaffActivityLogSerializer

class StaffActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing staff activity logs.
    Only users with can_view_audit_logs permission can access.
    """
    queryset = StaffActivityLog.objects.select_related('user').all()
    serializer_class = StaffActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        from users.permissions import CanViewAuditLogs
        return [permissions.IsAuthenticated(), CanViewAuditLogs()]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return StaffActivityLog.objects.none()
            
        qs = super().get_queryset()
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
            
        # Filter by action type
        action_type = self.request.query_params.get('action_type')
        if action_type:
            qs = qs.filter(action_type=action_type)
            
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(timestamp__gte=start_date)
        if end_date:
            qs = qs.filter(timestamp__lte=end_date)
            
        return qs
