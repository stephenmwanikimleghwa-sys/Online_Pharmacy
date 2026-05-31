"""
Helpers for enforcing JWT-scoped active branch on requests.
"""
from rest_framework import status
from rest_framework.response import Response


def get_active_branch(request):
    """Return the branch from the JWT claim (session branch), if set."""
    return getattr(request, "active_branch", None)


def active_branch_required_response():
    return Response(
        {
            "detail": "Active branch is required. Please select a branch before continuing.",
            "code": "active_branch_required",
        },
        status=status.HTTP_403_FORBIDDEN,
    )


def require_active_branch(request):
    """
    Return an error Response if no active branch is set on the request.
    Otherwise return None (caller may proceed).
    """
    if get_active_branch(request) is None:
        return active_branch_required_response()
    return None
