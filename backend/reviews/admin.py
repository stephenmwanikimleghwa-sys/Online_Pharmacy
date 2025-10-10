from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("user", "product", "rating", "is_active", "created_at")
    list_filter = ("rating", "is_active", "created_at", "product")
    search_fields = ("user__username", "comment", "product__name")
    readonly_fields = ("created_at", "updated_at")
    list_editable = ("is_active",)
    ordering = ("-created_at",)

    fieldsets = (
        ("Review Information", {"fields": ("user", "product", "rating", "comment")}),
        ("Status", {"fields": ("is_active",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ("user", "product")
        return self.readonly_fields

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "user":
            kwargs["queryset"] = kwargs["queryset"].filter(role="customer")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
