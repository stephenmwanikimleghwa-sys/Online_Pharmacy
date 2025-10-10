from rest_framework import permissions
from .models import User, RoleChoices


class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to admin users.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == RoleChoices.ADMIN


class IsPharmacistOrAdmin(permissions.BasePermission):
    """
    Allows access to pharmacists and admins.
    """

    def has_permission(self, request, views):
        return request.user.is_authenticated and request.user.role in [
            RoleChoices.PHARMACIST,
            RoleChoices.ADMIN,
        ]


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allows access to the owner of the object or admins.
    Assumes the view has a get_object method.
    """

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            request.user.role == RoleChoices.ADMIN or obj.user == request.user
        )


class RoleBasedPermission(permissions.BasePermission):
    """
    Custom permission class for role-based access control.
    Usage: permission_classes = [RoleBasedPermission(allowed_roles=['admin', 'pharmacist'])]
    """

    def __init__(self, allowed_roles):
        self.allowed_roles = allowed_roles

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in self.allowed_roles
