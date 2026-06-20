from rest_framework import serializers
from inventory.models.batch import Batch


class BatchSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    quantity = serializers.IntegerField(source="quantity_remaining", read_only=True)

    class Meta:
        model = Batch
        fields = [
            "id",
            "product",
            "branch",
            "batch_number",
            "supplier",
            "quantity_received",
            "quantity_remaining",
            "quantity",
            "expiry_date",
            "received_date",
            "cost_price",
            "is_clearance",
            "clearance_price",
            "is_active",
            "status",
            "days_to_expiry",
            "is_expired",
        ]
        read_only_fields = ["received_date", "status", "days_to_expiry", "is_expired"]
