"""
Helpers for enforcing JWT-scoped active branch on requests.
"""
from config.api_responses import ApiErrorCode, api_error


def get_active_branch(request):
    """Return the branch from the JWT claim (session branch), if set."""
    return getattr(request, "active_branch", None)


def active_branch_required_response():
    return api_error(
        ApiErrorCode.NO_ACTIVE_BRANCH,
        "Please select which branch you are working at before continuing.",
        http_status=403,
    )


def require_active_branch(request):
    """
    Return an error Response if no active branch is set on the request.
    Otherwise return None (caller may proceed).
    """
    if get_active_branch(request) is None:
        return active_branch_required_response()
    return None
