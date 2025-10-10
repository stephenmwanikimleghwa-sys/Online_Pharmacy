from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


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
