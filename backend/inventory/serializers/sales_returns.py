from rest_framework import serializers
from ..models.dispensing import SaleReturn, SaleReturnItem

class SaleReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='dispensation_item.product.name', read_only=True)
    product_id = serializers.IntegerField(source='dispensation_item.product.id', read_only=True)
    
    class Meta:
        model = SaleReturnItem
        fields = '__all__'

class SaleReturnSerializer(serializers.ModelSerializer):
    items = SaleReturnItemSerializer(many=True, read_only=True)
    initiated_by_name = serializers.CharField(source='initiated_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    
    class Meta:
        model = SaleReturn
        fields = '__all__'
        read_only_fields = ['status', 'initiated_by', 'approved_by', 'total_refund', 'branch']
