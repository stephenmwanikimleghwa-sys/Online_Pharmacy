from datetime import datetime, time, timedelta

from django.utils import timezone
from rest_framework import viewsets, permissions
from ..models import StaffActivityLog
from ..serializers import StaffActivityLogSerializer
from users.permissions import IsPharmacistOrAdmin

class StaffActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing staff activity logs.
    Only users with can_view_audit_logs permission can access.
    """
    queryset = StaffActivityLog.objects.select_related('user', 'branch').all()
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

        # Filter by branch
        branch_id = self.request.query_params.get('branch') or self.request.query_params.get('branch_id')
        if branch_id and branch_id != 'all':
            qs = qs.filter(branch_id=branch_id)
            
        # Filter by date range (inclusive calendar days when date-only)
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(timestamp__gte=self._parse_range_bound(start_date, end=False))
        if end_date:
            qs = qs.filter(timestamp__lte=self._parse_range_bound(end_date, end=True))
            
        return qs.order_by('-timestamp')

    @staticmethod
    def _parse_range_bound(value: str, *, end: bool):
        """Parse YYYY-MM-DD (or ISO) into an inclusive datetime bound."""
        raw = (value or "").strip()
        if not raw:
            return raw
        try:
            if len(raw) == 10 and raw[4] == "-" and raw[7] == "-":
                day = datetime.strptime(raw, "%Y-%m-%d").date()
                wall = datetime.combine(day, time.max if end else time.min)
                if timezone.is_naive(wall):
                    return timezone.make_aware(wall, timezone.get_current_timezone())
                return wall
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if end and parsed.hour == 0 and parsed.minute == 0 and parsed.second == 0 and len(raw) <= 10:
                parsed = parsed + timedelta(days=1) - timedelta(microseconds=1)
            if timezone.is_naive(parsed):
                return timezone.make_aware(parsed, timezone.get_current_timezone())
            return parsed
        except (TypeError, ValueError):
            return raw
