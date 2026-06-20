from rest_framework import serializers
from inventory.models.purchase_order import PurchaseOrder, PurchaseOrderItem


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "quantity_ordered",
            "estimated_unit_price",
            "actual_unit_price",
            "quantity_received",
        ]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "order_number",
            "supplier",
            "supplier_name",
            "branch",
            "branch_name",
            "status",
            "created_by",
            "created_by_name",
            "created_at",
            "expected_delivery",
            "notes",
            "cancellation_reason",
            "total_estimated_cost",
            "items",
        ]
        read_only_fields = [
            "order_number",
            "created_by",
            "created_at",
            "total_estimated_cost",
            "cancellation_reason",
        ]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        po = PurchaseOrder.objects.create(**validated_data)
        for item in items_data:
            PurchaseOrderItem.objects.create(purchase_order=po, **item)
        po.recalculate_total()
        return po

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                PurchaseOrderItem.objects.create(purchase_order=instance, **item)
            instance.recalculate_total()
        return instance
