"""
Branch session helpers for login, JWT claims, and switch-branch.
"""
from __future__ import annotations

from typing import Any

from users.models import Branch, RoleChoices, User


def get_allowed_branches(user: User):
    """Branches this user may operate under."""
    qs = Branch.objects.filter(is_active=True).select_related("pharmacy")
    if user.is_superuser or user.role == RoleChoices.ADMIN:
        if user.pharmacy_id:
            return qs.filter(pharmacy_id=user.pharmacy_id).order_by("name")
        return qs.order_by("name")
    if user.branch_id:
        return qs.filter(pk=user.branch_id)
    return qs.none()


def branch_to_dict(branch: Branch, *, include_type: bool = False) -> dict[str, Any]:
    data: dict[str, Any] = {"id": branch.id, "name": branch.name}
    if include_type:
        data["type"] = branch.branch_type
    return data


def resolve_branch_session(user: User, active_branch_id: int | None = None) -> dict[str, Any]:
    """
    Build allowed_branches, requires_branch_selection, and active_branch
    for login/profile responses.
    """
    allowed_qs = get_allowed_branches(user)
    allowed_branches = [branch_to_dict(b, include_type=True) for b in allowed_qs]
    count = len(allowed_branches)

    home_branch = None
    if user.branch_id:
        home_branch = branch_to_dict(user.branch)

    requires_branch_selection = False
    active_branch = None

    if count == 0:
        pass
    elif count == 1:
        active_branch = allowed_branches[0]
    elif user.is_superuser or user.role == RoleChoices.ADMIN:
        requires_branch_selection = True
        if active_branch_id:
            match = next((b for b in allowed_branches if b["id"] == active_branch_id), None)
            if match:
                active_branch = match
                requires_branch_selection = False
    else:
        # Staff with access to multiple branches (unusual) must pick one.
        requires_branch_selection = True
        if active_branch_id:
            match = next((b for b in allowed_branches if b["id"] == active_branch_id), None)
            if match:
                active_branch = match
                requires_branch_selection = False

    return {
        "allowed_branches": allowed_branches,
        "requires_branch_selection": requires_branch_selection,
        "active_branch": active_branch,
        "home_branch": home_branch,
    }


def user_may_access_branch(user: User, branch_id: int) -> bool:
    return get_allowed_branches(user).filter(pk=branch_id).exists()


def issue_tokens(user: User, active_branch_id: int | None = None) -> dict[str, str]:
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    if active_branch_id is not None:
        refresh["active_branch_id"] = active_branch_id
        refresh.access_token["active_branch_id"] = active_branch_id
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def login_user_payload(user: User) -> dict[str, Any]:
    """Compact user object for login response."""
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "home_branch": branch_to_dict(user.branch) if user.branch_id else None,
    }
