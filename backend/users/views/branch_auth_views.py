"""
Branch selection and switch endpoints.
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.branch_auth import (
    branch_to_dict,
    issue_tokens,
    resolve_branch_session,
    user_may_access_branch,
)
from users.models import Branch, StaffActivityLog
from config.api_responses import ApiErrorCode, api_error, api_success


def _client_ip(request):
    if not request:
        return None
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class SwitchBranchView(APIView):
    """
    POST /api/auth/switch-branch/
    Body: { "branch_id": <int> }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        branch_id = request.data.get("branch_id")
        if branch_id is None:
            return Response(
                {"branch_id": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            branch_id = int(branch_id)
        except (TypeError, ValueError):
            return Response(
                {"branch_id": ["A valid integer is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            branch = Branch.objects.get(pk=branch_id, is_active=True)
        except Branch.DoesNotExist:
            return api_error(
                ApiErrorCode.BRANCH_ACCESS_DENIED,
                "That branch could not be found.",
                http_status=status.HTTP_404_NOT_FOUND,
            )

        if not user_may_access_branch(request.user, branch_id):
            return api_error(
                ApiErrorCode.BRANCH_ACCESS_DENIED,
                f"You are not assigned to {branch.name}. Ask an admin to grant you access.",
                details={"branch_name": branch.name, "branch_id": branch_id},
                http_status=status.HTTP_403_FORBIDDEN,
            )

        tokens = issue_tokens(request.user, active_branch_id=branch.id)
        session = resolve_branch_session(request.user, active_branch_id=branch.id)

        from users.utils import log_activity
        log_activity(
            user=request.user,
            event_type='BRANCH_SWITCHED',
            branch=branch,
            details_dict={'action': 'User switched active branch'},
            ip_address=_client_ip(request),
        )

        return api_success(
            f"You are now working at {branch.name}.",
            data={
                "active_branch": branch_to_dict(branch, include_type=True),
                "requires_branch_selection": session["requires_branch_selection"],
                "tokens": tokens,
            },
            extra={
                "active_branch": branch_to_dict(branch, include_type=True),
                "requires_branch_selection": session["requires_branch_selection"],
                "tokens": tokens,
            },
        )
