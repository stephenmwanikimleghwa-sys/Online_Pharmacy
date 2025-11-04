from rest_framework import serializers
from products.models import StockLog

class StockLogSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    logged_by_username = serializers.CharField(
        source="logged_by.username", read_only=True
    )
    timestamp = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S")

    class Meta:
        model = StockLog
        fields = [
            "id",
            "product",
            "product_name",
            "previous_quantity",
            "new_quantity",
            "change_amount",
            "change_type",
            "reason",
            "logged_by",
            "logged_by_username",
            "timestamp",
            "alert_triggered",
        ]
        read_only_fields = [
            "id",
            "product_name",
            "logged_by_username",
            "timestamp",
            "alert_triggered",
        ]

    def validate_change_amount(self, value):
        """Ensure change amount is not zero"""
        if value == 0:
            raise serializers.ValidationError("Change amount cannot be zero")
        return value

    def validate(self, data):
        """Validate that new quantity matches calculation"""
        if "previous_quantity" in data and "change_amount" in data:
            expected_new_quantity = data["previous_quantity"] + data["change_amount"]
            if expected_new_quantity < 0:
                raise serializers.ValidationError("Stock quantity cannot be negative")
        return data