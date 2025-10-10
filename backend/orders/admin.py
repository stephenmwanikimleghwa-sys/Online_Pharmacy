from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1
    fields = ("product", "quantity", "unit_price")
    readonly_fields = ("subtotal",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "total_amount", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("id", "user__username")
    readonly_fields = ("created_at", "updated_at")
    inlines = [OrderItemInline]
    ordering = ("-created_at",)

    fieldsets = (
        (
            "Order Information",
            {
                "fields": (
                    "user",
                    "total_amount",
                    "status",
                    "delivery_address",
                    "notes",
                ),
            },
        ),
        (
            "Payment",
            {
                "fields": ("payment",),
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
        if obj:
            return self.readonly_fields + ("user", "total_amount")
        return self.readonly_fields
