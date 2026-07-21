from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dashboard.permissions import IsAdminRole
from dashboard.services import build_branch_operations, build_global_overview
from users.active_branch import active_branch_required_response, get_active_branch
from utils.cached_view import cached_view


class GlobalOverviewView(APIView):
    """
    GET /api/dashboard/global-overview/
    Aggregated metrics across all branches. Admin only.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        # build_global_overview scopes branches by the admin's pharmacy (or all
        # branches for a superuser with no pharmacy). The cache key MUST include
        # that scope, otherwise a pharmacy-scoped admin and a superuser (or two
        # admins from different pharmacies) would share one cached blob and see
        # each other's data. Key by pharmacy_id, with a distinct key for the
        # global superuser view.
        user = request.user
        if user.is_superuser and not getattr(user, "pharmacy_id", None):
            scope = "super"
        else:
            scope = f"pharmacy_{getattr(user, 'pharmacy_id', None) or 'none'}"
        cache_key = f"dashboard_global_{scope}"
        data = cached_view(
            cache_key,
            lambda: build_global_overview(request.user),
            timeout=60,
        )
        return Response(data)


class BranchOperationsView(APIView):
    """
    GET /api/dashboard/branch-operations/
    Operational data for request.active_branch only.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        branch = get_active_branch(request)
        if branch is None:
            return active_branch_required_response()
        cache_key = f"dashboard_branch_{branch.id}"
        data = cached_view(
            cache_key,
            lambda: build_branch_operations(branch),
            timeout=60,
        )
        return Response(data)
