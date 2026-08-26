from rest_framework import permissions
from .models import User, RoleChoices

class IsAdminUser(permissions.BasePermission):
    """
    Allows access to users with manage_users permission.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.role == RoleChoices.ADMIN or 
            request.user.can_manage_users
        )

class IsPharmacistOrAdmin(permissions.BasePermission):
    """
    Pharmacists, cashiers, and admins may access operational endpoints.
    Granular flags (can_process_sales, etc.) further restrict sensitive actions.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if request.user.role in (
            RoleChoices.ADMIN,
            RoleChoices.PHARMACIST,
            RoleChoices.CASHIER,
        ):
            return True
        return bool(
            request.user.can_process_sales or request.user.can_manage_inventory
        )

class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allows access to the owner of the object or admins.
    """
    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.role == RoleChoices.ADMIN or 
            obj.user == request.user
        )

class IsAuditorOrAdmin(permissions.BasePermission):
    """
    Staff who may view operational reports (valuation, staff activity, analytics).
    Admins, auditors, and pharmacists have access by role; others need can_view_reports.
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        role = getattr(user, "role", None)
        if role in (
            RoleChoices.ADMIN,
            RoleChoices.AUDITOR,
            RoleChoices.PHARMACIST,
        ):
            return True
        return bool(getattr(user, "can_view_reports", False))


class CanViewReports(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        role = getattr(user, "role", None)
        if role in (
            RoleChoices.ADMIN,
            RoleChoices.AUDITOR,
            RoleChoices.PHARMACIST,
        ):
            return True
        return bool(getattr(user, "can_view_reports", False))


# Granular Permission Classes

class CanManageCatalog(permissions.BasePermission):
    """
    Create/edit/delete products and mutate catalog prices.
    Admin only — pharmacists sell and view stock; they do not own the catalog.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user.is_superuser or getattr(user, "role", None) == RoleChoices.ADMIN
        )


class CanProcessSales(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_process_sales)

class CanManageInventory(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or getattr(user, "role", None) == RoleChoices.ADMIN:
            return True
        return bool(getattr(user, "can_manage_inventory", False))

class CanEditPrices(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or getattr(user, "role", None) == RoleChoices.ADMIN:
            return True
        return bool(getattr(user, "can_edit_prices", False))

class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_manage_users)

class CanDeleteRecords(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_delete_records)

class CanViewAuditLogs(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_view_audit_logs)
