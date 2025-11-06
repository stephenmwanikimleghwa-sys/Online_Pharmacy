from rest_framework import serializers
from .models import DispensingLog

class DispensingLogSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    dispensed_by_name = serializers.CharField(source='dispensed_by.get_full_name', read_only=True)
    created_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)

    class Meta:
        model = DispensingLog
        fields = [
            'id', 'product', 'product_name', 'quantity',
            'dispensed_by', 'dispensed_by_name', 'order',
            'previous_stock', 'new_stock', 'total_cost', 'created_at', 'notes'
        ]
        read_only_fields = fields  # Make all fields read-only