from rest_framework import serializers
from products.models import Product, CategoryChoices
from django.core.exceptions import ValidationError
from .pricing_tier import PricingTierSerializer
from typing import Any, Dict
from decimal import Decimal


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for listing and retrieving products.
    """
    pricing_tier = PricingTierSerializer(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "category",
            "dosage_form",
            "manufacturer",
            "strength",
            "supplier",
            "expiry_date",
            "price",
            "pricing_tier",
            "stock_quantity",
            "reorder_threshold",
            "image",
            "is_active",
            "is_low_stock",
            "expiry_status",
            "days_until_expiry",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_low_stock", "expiry_status", "days_until_expiry", "created_at", "updated_at")

    def to_representation(self, instance):
        """Handle missing pricing_tier gracefully."""
        data = super().to_representation(instance)
        # Check if pricing_tier exists
        try:
            if not hasattr(instance, 'pricing_tier') or instance.pricing_tier is None:
                data['pricing_tier'] = None
        except Exception:
            data['pricing_tier'] = None
        return data


class ProductCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new product.
    Validates price > 0, stock >= 0, requires pharmacy.
    """

    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    stock_quantity = serializers.IntegerField(min_value=0)

    class Meta:
        model = Product
        fields = (
            "name",
            "description",
            "category",
            "dosage_form",
            "manufacturer",
            "strength",
            "price",
            "stock_quantity",
            "supplier",
            "expiry_date",
            "image",
        )

    # Removed validate_pharmacy since we're auto-assigning pharmacy

    def validate_price(self, value: Decimal) -> Decimal:
        """
        Validate that the price is greater than 0.
        """
        if value <= 0:
            raise ValidationError("Price must be greater than 0.")
        return value

    def validate_stock_quantity(self, value: int) -> int:
        """
        Validate that stock quantity is non-negative.
        """
        if value < 0:
            raise ValidationError("Stock quantity cannot be negative.")
        return value

    def create(self, validated_data: Dict[str, Any]) -> Product:
        """
        Create a new product instance.
        """
        # Create products without pharmacy association
        return super().create(validated_data)


class ProductUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating product details (partial updates).
    Validates price/stock if changed.
    """

    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0.01, required=False
    )
    stock_quantity = serializers.IntegerField(min_value=0, required=False)

    class Meta:
        model = Product
        fields = (
            "name",
            "description",
            "category",
            "dosage_form",
            "manufacturer",
            "strength",
            "price",
            "stock_quantity",
            "image",
            "is_active",
        )

    def validate_price(self, value: Decimal) -> Decimal:
        """
        Validate that the price is greater than 0 if provided.
        """
        if value is not None and value <= 0:
            raise ValidationError("Price must be greater than 0.")
        return value

    def validate_stock_quantity(self, value: int) -> int:
        """
        Validate that stock quantity is non-negative if provided.
        """
        if value is not None and value < 0:
            raise ValidationError("Stock quantity cannot be negative.")
        return value
