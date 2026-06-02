from rest_framework import viewsets, permissions
from ..models import StaffActivityLog
from ..serializers import StaffActivityLogSerializer
from users.permissions import IsPharmacistOrAdmin

class StaffActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing staff activity logs.
    Only users with can_view_audit_logs permission can access.
    """
    queryset = StaffActivityLog.objects.select_related('user').all()
    serializer_class = StaffActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsPharmacistOrAdmin]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return StaffActivityLog.objects.none()
            
        qs = super().get_queryset()
        user = self.request.user
        # Non-admin staff should only see their own actions
        if not (user.is_superuser or getattr(user, "role", None) == "admin"):
            qs = qs.filter(user=user)
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
            
        # Filter by event type
        event_type = self.request.query_params.get('event_type') or self.request.query_params.get('action_type')
        if event_type:
            qs = qs.filter(event_type=event_type)
            
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(timestamp__gte=start_date)
        if end_date:
            qs = qs.filter(timestamp__lte=end_date)
            
        return qs
