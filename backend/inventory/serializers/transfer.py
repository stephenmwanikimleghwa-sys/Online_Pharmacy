from rest_framework import serializers
from products.models import BranchStock
from ..models import InterBranchTransfer


class InterBranchTransferSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    source_branch_name = serializers.CharField(source="source_branch.name", read_only=True)
    destination_branch_name = serializers.CharField(
        source="destination_branch.name", read_only=True
    )
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.CharField(
        source="approved_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = InterBranchTransfer
        fields = [
            "id",
            "product",
            "product_name",
            "source_branch",
            "source_branch_name",
            "destination_branch",
            "destination_branch_name",
            "quantity",
            "requested_by",
            "requested_by_name",
            "approved_by",
            "approved_by_name",
            "status",
            "notes",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["requested_by", "approved_by", "status", "rejection_reason"]

    def get_requested_by_name(self, obj):
        if not obj.requested_by:
            return None
        return obj.requested_by.get_full_name() or obj.requested_by.username

    def validate(self, attrs):
        source = attrs.get("source_branch") or getattr(self.instance, "source_branch", None)
        destination = attrs.get("destination_branch") or getattr(
            self.instance, "destination_branch", None
        )
        quantity = attrs.get("quantity")
        product = attrs.get("product") or getattr(self.instance, "product", None)

        if source and destination and source.id == destination.id:
            raise serializers.ValidationError(
                {"destination_branch": "Source and destination branch must be different."}
            )

        if quantity is not None and quantity <= 0:
            raise serializers.ValidationError({"quantity": "Quantity must be at least 1."})

        if source and product and quantity:
            stock = BranchStock.objects.filter(product=product, branch=source).first()
            available = stock.quantity if stock else 0
            if available < quantity:
                raise serializers.ValidationError(
                    {
                        "quantity": (
                            f"Only {available} units available at {source.name} "
                            f"for {product.name}."
                        )
                    }
                )
        return attrs
