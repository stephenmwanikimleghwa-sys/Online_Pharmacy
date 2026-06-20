from rest_framework import serializers
from ..models.stock_intake import StockIntake
from products.serializers import ProductSerializer


class StockIntakeSerializer(serializers.ModelSerializer):
    """Serializer for StockIntake records."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    received_by_username = serializers.CharField(
        source="received_by.username", read_only=True
    )
    cost_price = serializers.DecimalField(
        source="unit_cost", max_digits=15, decimal_places=2, read_only=True
    )
    intake_date = serializers.DateTimeField(source="received_date", read_only=True)

    class Meta:
        model = StockIntake
        fields = [
            "id",
            "product",
            "product_name",
            "branch",
            "branch_name",
            "supplier",
            "supplier_name",
            "payment_status",
            "invoice_number",
            "quantity_received",
            "unit_cost",
            "cost_price",
            "total_cost",
            "expiry_date",
            "batch_number",
            "received_date",
            "intake_date",
            "received_by",
            "received_by_username",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_cost",
            "received_date",
            "created_at",
            "updated_at",
            "received_by",
        ]


class StockIntakeDetailSerializer(StockIntakeSerializer):
    """Detailed serializer for StockIntake with related product info."""

    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True, required=True)

    class Meta(StockIntakeSerializer.Meta):
        fields = StockIntakeSerializer.Meta.fields + ["product_id"]
