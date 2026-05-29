from rest_framework import serializers
from ..models.returns import ProductReturn

class ProductReturnSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    handled_by_name = serializers.CharField(source='handled_by.username', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = ProductReturn
        fields = '__all__'
        read_only_fields = ['handled_by', 'branch']
