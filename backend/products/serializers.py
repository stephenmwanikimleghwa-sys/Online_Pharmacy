from rest_framework import serializers
from .models import Product, CategoryChoices
from django.core.exceptions import ValidationError


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for listing and retrieving products.
    """

    pharmacy_name = serializers.CharField(source="pharmacy.name", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "category",
            "price",
            "stock_quantity",
            "pharmacy_name",
            "image",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


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
            "price",
            "stock_quantity",
            "image",
        )

    def validate_pharmacy(self, value):
        if value.status != "active":
            raise ValidationError("Product can only be added to active pharmacies.")
        return value

    def validate_price(self, value):
        if value <= 0:
            raise ValidationError("Price must be greater than 0.")
        return value

    def validate_stock_quantity(self, value):
        if value < 0:
            raise ValidationError("Stock quantity cannot be negative.")
        return value

    def create(self, validated_data):
        # Ensure pharmacy is set (for pharmacists, auto-set if not provided)
        request = self.context.get("request")
        if (
            request
            and request.user.role == "pharmacist"
            and not validated_data.get("pharmacy")
        ):
            pharmacy = request.user.pharmacies.first()
            if pharmacy:
                validated_data["pharmacy"] = pharmacy
            else:
                raise ValidationError("Pharmacist must have an associated pharmacy.")
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
            "price",
            "stock_quantity",
            "image",
            "is_active",
        )

    def validate_price(self, value):
        if value is not None and value <= 0:
            raise ValidationError("Price must be greater than 0.")
        return value

    def validate_stock_quantity(self, value):
        if value is not None and value < 0:
            raise ValidationError("Stock quantity cannot be negative.")
        return value
