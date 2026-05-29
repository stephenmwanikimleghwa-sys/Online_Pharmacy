from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Branch, Pharmacy, StaffActivityLog


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'pharmacy', 'contact_phone', 'is_active', 'is_headquarters', 'created_at')
    list_filter = ('is_active', 'is_headquarters', 'pharmacy')
    search_fields = ('name', 'address', 'contact_phone', 'license_number')
    ordering = ('pharmacy', 'name')


@admin.register(StaffActivityLog)
class StaffActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'event_type', 'timestamp', 'ip_address', 'branch')
    list_filter = ('event_type', 'timestamp', 'branch')
    search_fields = ('user__username', 'ip_address', 'branch__name')
    ordering = ('-timestamp',)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "role",
        "phone_number",
        "is_verified",
        "is_staff",
        "is_active",
    )
    list_filter = ("role", "is_verified", "is_staff", "is_active", "created_at")
    search_fields = ("username", "email", "first_name", "last_name", "phone_number")
    ordering = ("-created_at",)

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Additional Information",
            {
                "fields": (
                    "role",
                    "pharmacy",
                    "branch",
                    "phone_number",
                    "profile_picture",
                    "date_of_birth",
                    "address",
                    "is_verified",
                )
            },
        ),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (
            "Additional Information",
            {
                "fields": (
                    "role",
                    "phone_number",
                    "profile_picture",
                    "date_of_birth",
                    "address",
                )
            },
        ),
    )
