from rest_framework import serializers
from ..models import Quotation, QuotationItem

class QuotationItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = QuotationItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'subtotal']
        read_only_fields = ['subtotal']

class QuotationSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Quotation
        fields = [
            'id', 'branch', 'branch_name', 'created_by', 'created_by_name',
            'customer_name', 'customer_phone', 'customer_email',
            'total_amount', 'valid_until', 'status', 'notes',
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['created_by', 'total_amount', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        
        # Calculate total_amount if not provided
        total = sum([item['quantity'] * item['unit_price'] for item in items_data])
        validated_data['total_amount'] = total
        
        quotation = Quotation.objects.create(**validated_data)
        
        for item_data in items_data:
            item_data['subtotal'] = item_data['quantity'] * item_data['unit_price']
            QuotationItem.objects.create(quotation=quotation, **item_data)
            
        return quotation

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Update main quotation fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if items_data is not None:
            # Rebuild items completely or update existing based on your needs
            # For simplicity, we delete existing and recreate
            instance.items.all().delete()
            total = 0
            for item_data in items_data:
                subtotal = item_data['quantity'] * item_data['unit_price']
                total += subtotal
                QuotationItem.objects.create(
                    quotation=instance,
                    subtotal=subtotal,
                    **item_data
                )
            instance.total_amount = total
            
        instance.save()
        return instance
