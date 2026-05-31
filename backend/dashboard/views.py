from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dashboard.permissions import IsAdminRole
from dashboard.services import build_branch_operations, build_global_overview
from users.active_branch import active_branch_required_response, get_active_branch


class GlobalOverviewView(APIView):
    """
    GET /api/dashboard/global-overview/
    Aggregated metrics across all branches. Admin only.
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        return Response(build_global_overview(request.user))


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
        return Response(build_branch_operations(branch))
