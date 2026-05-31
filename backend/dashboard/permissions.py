from rest_framework import permissions

from users.models import RoleChoices


class IsAdminRole(permissions.BasePermission):
    """Only users with role=admin (or superuser)."""

    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and (
            user.is_superuser or user.role == RoleChoices.ADMIN
        )
