"""
Branch session helpers for login, JWT claims, and switch-branch.
"""
from __future__ import annotations

from typing import Any

from users.models import Branch, RoleChoices, User

# Shown on branch selection cards when address is not set in DB
BRANCH_SUBTITLE_DEFAULTS: dict[str, str] = {
    "TRANSCOUNTY_MAIN": "Kitale Town",
    "TRANSCOUNTY_ANNEX": "Kitale Annex",
    "PEAKFARM": "Agrovet Branch",
}


def branch_subtitle(branch: Branch) -> str:
    address = (branch.address or "").strip()
    if address and address not in ("-", "N/A"):
        return address[:125]
    return BRANCH_SUBTITLE_DEFAULTS.get(branch.name, branch.get_branch_type_display())


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


def branch_to_dict(branch: Branch, *, include_type: bool = True) -> dict[str, Any]:
    return {
        "id": branch.id,
        "name": branch.name,
        "type": branch.branch_type,
        "subtitle": branch_subtitle(branch),
        "is_headquarters": branch.is_headquarters,
    }


def resolve_branch_session(user: User, active_branch_id: int | None = None) -> dict[str, Any]:
    """
    Build allowed_branches, requires_branch_selection, and active_branch
    for login/profile responses.
    """
    allowed_qs = get_allowed_branches(user)
    allowed_branches = [branch_to_dict(b, include_type=True) for b in allowed_qs]
    # Enrich active_branch entries with full card fields when resolved from id only
    def _enrich(branch_data: dict[str, Any] | None) -> dict[str, Any] | None:
        if not branch_data:
            return None
        full = next((b for b in allowed_branches if b["id"] == branch_data["id"]), None)
        return full if full else branch_data

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
        # Staff with multiple allowed branches (unusual) must pick one
        requires_branch_selection = True
        if active_branch_id:
            match = next((b for b in allowed_branches if b["id"] == active_branch_id), None)
            if match:
                active_branch = match
                requires_branch_selection = False

    return {
        "allowed_branches": allowed_branches,
        "requires_branch_selection": requires_branch_selection,
        "active_branch": _enrich(active_branch),
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
