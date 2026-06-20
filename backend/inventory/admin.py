from django.contrib import admin
from .models.stock_intake import StockIntake
from .models.purchase_order import PurchaseOrder, PurchaseOrderItem


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "supplier",
        "branch",
        "status",
        "total_estimated_cost",
        "created_at",
    )
    list_filter = ("status", "branch", "supplier")
    inlines = [PurchaseOrderItemInline]


@admin.register(StockIntake)
class StockIntakeAdmin(admin.ModelAdmin):
    """Admin interface for StockIntake records."""

    list_display = (
        "product",
        "supplier",
        "branch",
        "quantity_received",
        "unit_cost",
        "total_cost",
        "received_date",
        "received_by",
    )
    list_filter = ("received_date", "supplier", "product", "branch")
    search_fields = ("supplier__name", "product__name", "batch_number", "invoice_number")
    readonly_fields = ("total_cost", "received_date", "created_at", "updated_at")
    date_hierarchy = "received_date"

    fieldsets = (
        ("Product Info", {"fields": ("product", "branch")}),
        ("Supplier Info", {"fields": ("supplier", "invoice_number", "payment_status", "batch_number")}),
        ("Stock Details", {"fields": ("quantity_received", "unit_cost", "total_cost", "expiry_date")}),
        ("Receipt Info", {"fields": ("received_date", "received_by", "notes")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.received_by = request.user
        super().save_model(request, obj, form, change)
