from rest_framework import serializers
from .models import Review
from products.models import Product
from users.models import User


class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new review.
    Validates rating (1-5) and ensures user hasn't reviewed the product before.
    """

    rating = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = Review
        fields = ("rating", "comment", "product")

    def validate(self, attrs):
        product_id = self.context["view"].kwargs.get("product_id")
        if product_id:
            attrs["product_id"] = product_id
        return attrs

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        validated_data["is_active"] = True
        return super().create(validated_data)


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for listing and retrieving reviews.
    Includes user and product names for display.
    """

    user = serializers.StringRelatedField()
    product = serializers.StringRelatedField()

    class Meta:
        model = Review
        fields = (
            "id",
            "user",
            "product",
            "rating",
            "comment",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user", "product", "created_at", "updated_at")


class ReviewUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating a review (e.g., edit comment or rating).
    Only the owner or admin can update.
    """

    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)

    class Meta:
        model = Review
        fields = ("rating", "comment", "is_active")

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
