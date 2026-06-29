from rest_framework import serializers
from products.models import PricingTier, Product


class PricingTierSerializer(serializers.ModelSerializer):
    """Serializer for PricingTier model."""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    
    class Meta:
        model = PricingTier
        fields = [
            'id',
            'product',
            'product_id',
            'product_name',
            'buying_price',
            'wholesale_price',
            'retail_price',
            'minimum_wholesale_quantity',
            'is_active',
            'use_legacy_prices',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'wholesale_price',
            'retail_price',
            'use_legacy_prices',
            'created_at',
            'updated_at',
        ]

    def validate_buying_price(self, value):
        """Ensure buying price is positive."""
        if value <= 0:
            raise serializers.ValidationError("Buying price must be greater than 0.")
        return value

    def validate_minimum_wholesale_quantity(self, value):
        """Ensure minimum wholesale quantity is positive."""
        if value <= 0:
            raise serializers.ValidationError(
                "Minimum wholesale quantity must be greater than 0."
            )
        return value

    def create(self, validated_data):
        """Create PricingTier and update product price."""
        return PricingTier.objects.create(**validated_data)

    def update(self, instance, validated_data):
        """Update PricingTier and recalculate prices."""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
