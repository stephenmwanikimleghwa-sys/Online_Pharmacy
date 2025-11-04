from rest_framework import serializers
from ..models import RestockRequest
from products.serializers import ProductSerializer
from users.serializers import UserProfileSerializer

class RestockRequestSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    requested_by_details = UserProfileSerializer(source='requested_by', read_only=True)
    approved_by_details = UserProfileSerializer(source='approved_by', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = RestockRequest
        fields = [
            'id',
            'product',
            'product_details',
            'requested_by',
            'requested_by_details',
            'approved_by',
            'approved_by_details',
            'requested_quantity',
            'current_quantity',
            'status',
            'status_display',
            'notes',
            'supplier',
            'estimated_cost',
            'created_at',
            'updated_at',
            'completed_at'
        ]
        read_only_fields = [
            'requested_by',
            'approved_by',
            'created_at',
            'updated_at',
            'completed_at'
        ]