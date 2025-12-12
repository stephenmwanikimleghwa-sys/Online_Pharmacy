from django.contrib import admin
from .models.stock_intake import StockIntake


@admin.register(StockIntake)
class StockIntakeAdmin(admin.ModelAdmin):
    """Admin interface for StockIntake records."""
    list_display = ('product', 'distributor_name', 'quantity_received', 'unit_cost', 'total_cost', 'received_date', 'received_by')
    list_filter = ('received_date', 'distributor_name', 'product')
    search_fields = ('distributor_name', 'product__name', 'batch_number')
    readonly_fields = ('total_cost', 'received_date', 'created_at', 'updated_at')
    date_hierarchy = 'received_date'
    
    fieldsets = (
        ('Product Info', {
            'fields': ('product',)
        }),
        ('Distributor Info', {
            'fields': ('distributor_name', 'batch_number')
        }),
        ('Stock Details', {
            'fields': ('quantity_received', 'unit_cost', 'total_cost', 'expiry_date')
        }),
        ('Receipt Info', {
            'fields': ('received_date', 'received_by', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """Automatically set received_by to current user."""
        if not change:  # Only on creation
            obj.received_by = request.user
        super().save_model(request, obj, form, change)
