"""
Helpers for enforcing JWT-scoped active branch on requests.
"""
from django.db.models import QuerySet

from config.api_responses import ApiErrorCode, api_error
from users.branch_auth import user_may_access_branch


def get_active_branch(request):
    """Return the branch from the JWT claim (session branch), if set."""
    return getattr(request, "active_branch", None)


def resolve_request_branch(request, explicit_branch_id=None):
    """
    Resolve the branch a write operation should use.
    Prefers JWT active branch; optional explicit_branch_id must be allowed.
    """
    active = get_active_branch(request)
    if explicit_branch_id is not None:
        try:
            explicit_branch_id = int(explicit_branch_id)
        except (TypeError, ValueError):
            return None
        if not user_may_access_branch(request.user, explicit_branch_id):
            return None
        from users.models import Branch

        try:
            return Branch.objects.get(pk=explicit_branch_id, is_active=True)
        except Branch.DoesNotExist:
            return None
    return active or getattr(request.user, "branch", None)


def filter_queryset_for_branch(
    request,
    queryset: QuerySet,
    *,
    branch_field: str = "branch",
    branch_param: str = "branch",
) -> QuerySet:
    """Scope a queryset to the caller's active branch unless admin overrides."""
    user = request.user
    is_admin = user.is_superuser or getattr(user, "role", None) == "admin"
    active = get_active_branch(request)
    param = request.query_params.get(branch_param)

    if is_admin and param:
        if param == "all":
            return queryset
        return queryset.filter(**{f"{branch_field}_id": param})
    if active:
        return queryset.filter(**{branch_field: active})
    if not is_admin and getattr(user, "branch_id", None):
        return queryset.filter(**{f"{branch_field}_id": user.branch_id})
    if is_admin:
        return queryset
    return queryset.none()


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
