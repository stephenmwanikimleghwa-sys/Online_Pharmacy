from rest_framework import serializers
from inventory.models import Batch
from .supplier import SupplierSerializer

class BatchSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Batch
        fields = [
            'id', 'product', 'product_name', 'batch_number', 'supplier', 'supplier_name',
            'quantity', 'expiry_date', 'received_date', 'is_active'
        ]
        read_only_fields = ['received_date']
