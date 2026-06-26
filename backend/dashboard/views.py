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
        data = cached_view(
            "dashboard_global",
            lambda: build_global_overview(request.user),
            timeout=60,
        )
        return Response(data)


class BranchOperationsView(APIView):
    """
    GET /api/dashboard/branch-operations/
    Operational data for request.active_branch only.
    """

    permission_classes = [IsAuthenticated]

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
