from rest_framework import serializers
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
