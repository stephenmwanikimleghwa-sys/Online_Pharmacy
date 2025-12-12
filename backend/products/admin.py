from django.contrib import admin
from .models import Product, PricingTier


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "price",
        "stock_quantity",
        "is_active",
        "created_at",
    )
    list_filter = (
        "category",
        "is_active",
        "created_at",
    )
    search_fields = ("name", "description", "category")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "name",
                    "description",
                    "category",
                )
            },
        ),
        (
            "Pricing & Inventory",
            {
                "fields": (
                    "price",
                    "stock_quantity",
                    "is_active",
                )
            },
        ),
        (
            "Media",
            {
                "fields": ("image",),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_readonly_fields(self, request, obj=None):
        return self.readonly_fields


@admin.register(PricingTier)
class PricingTierAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "buying_price",
        "wholesale_price",
        "retail_price",
        "minimum_wholesale_quantity",
        "is_active",
    )
    list_filter = (
        "is_active",
        "created_at",
    )
    search_fields = ("product__name",)
    ordering = ("-created_at",)
    readonly_fields = ("wholesale_price", "retail_price", "created_at", "updated_at")

    fieldsets = (
        (
            "Product Information",
            {
                "fields": (
                    "product",
                )
            },
        ),
        (
            "Pricing",
            {
                "fields": (
                    "buying_price",
                    "wholesale_price",
                    "retail_price",
                    "minimum_wholesale_quantity",
                )
            },
        ),
        (
            "Status",
            {
                "fields": ("is_active",)
            },
        ),
        (
            "Timestamps",
            {
                "fields": ("created_at", "updated_at"),
                "classes": ("collapse",),
            },
        ),
    )

    def get_readonly_fields(self, request, obj=None):
        return self.readonly_fields

