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
    Allows access to users who can process sales or manage inventory.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.role == RoleChoices.ADMIN or 
            request.user.can_process_sales or 
            request.user.can_manage_inventory
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
    Allows access to users who can view reports.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or 
            request.user.role == RoleChoices.ADMIN or 
            request.user.can_view_reports
        )

# Granular Permission Classes

class CanProcessSales(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_process_sales)

class CanManageInventory(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_manage_inventory)

class CanEditPrices(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_edit_prices)

class CanViewReports(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_view_reports)

class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_manage_users)

class CanDeleteRecords(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_delete_records)

class CanViewAuditLogs(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_superuser or request.user.can_view_audit_logs)
