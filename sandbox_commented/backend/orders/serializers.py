# from rest_framework import serializers
# from .models import Order, OrderItem, OrderStatusChoices
# from products.models import Product
# from users.models import User
# from django.core.exceptions import ValidationError
# from django.utils import timezone
# from decimal import Decimal
# 
# 
# class OrderItemSerializer(serializers.ModelSerializer):
#     """
#     Serializer for order items (line items in an order).
#     """
# 
#     product_name = serializers.CharField(source="product.name", read_only=True)
#     product_id = serializers.PrimaryKeyRelatedField(
#         queryset=Product.objects.all(), source="product", write_only=True
#     )
# 
#     class Meta:
#         model = OrderItem
#         fields = ("product_id", "product_name", "quantity", "unit_price", "subtotal")
#         read_only_fields = ("subtotal",)
# 
#     def validate_quantity(self, value):
#         if value <= 0:
#             raise ValidationError("Quantity must be positive.")
#         return value
# 
#     def validate_unit_price(self, value):
#         if value <= 0:
#             raise ValidationError("Unit price must be positive.")
#         return value
# 
# 
# class OrderSerializer(serializers.ModelSerializer):
#     """
#     Serializer for listing and retrieving orders.
#     Includes nested items and payment info.
#     """
# 
#     user = serializers.StringRelatedField(read_only=True)
# 
#     payment = serializers.StringRelatedField(read_only=True)
#     items = OrderItemSerializer(many=True, read_only=True)
# 
#     class Meta:
#         model = Order
#         fields = (
#             "id",
#             "user",
#             "items",
#             "total_amount",
#             "status",
#             "payment",
#             "delivery_address",
#             "notes",
#             "created_at",
#             "updated_at",
#         )
#         read_only_fields = ("id", "created_at", "updated_at")
# 
#     def to_representation(self, instance):
#         data = super().to_representation(instance)
#         data["is_paid"] = instance.is_paid
#         return data
# 
# 
# class OrderCreateSerializer(serializers.ModelSerializer):
#     """
#     Serializer for creating a new order.
#     Validates items, total, and pharmacy.
#     """
# 
#     items = OrderItemSerializer(many=True)
#     total_amount = serializers.DecimalField(
#         max_digits=10, decimal_places=2, read_only=True
#     )
# 
#     class Meta:
#         model = Order
#         fields = (
#             "items",
#             "delivery_address",
#             "notes",
#             "total_amount",
#         )
# 
#     def validate_items(self, value):
#         if not value:
#             raise ValidationError("Order must have at least one item.")
#         total = sum(item["quantity"] * item["unit_price"] for item in value)
#         self.initial_data["total_amount"] = total  # Set for validation
#         return value
# 
#     def create(self, validated_data):
#         items_data = validated_data.pop("items")
#         order = Order.objects.create(
#             user=self.context["request"].user,
#             total_amount=self.initial_data["total_amount"],
#             status="pending",
#             delivery_address=validated_data["delivery_address"],
#             notes=validated_data.get("notes", ""),
#         )
# 
#         for item_data in items_data:
#             product = item_data.pop("product_id")
#             OrderItem.objects.create(
#                 order=order,
#                 product=product,
#                 quantity=item_data["quantity"],
#                 unit_price=item_data["unit_price"],
#             )
# 
#         return order
# 
# 
# class OrderUpdateSerializer(serializers.ModelSerializer):
#     """
#     Serializer for updating order status (e.g., by admin/pharmacist).
#     Partial updates for status/notes.
#     """
# 
#     status = serializers.ChoiceField(choices=OrderStatusChoices.choices, required=False)
# 
#     class Meta:
#         model = Order
#         fields = ("status", "notes", "delivery_address")
# 
#     def validate_status(self, value):
#         user = self.context["request"].user
#         if value in ["confirmed", "shipped", "delivered"]:
#             if user.role not in ["admin", "pharmacist"]:
#                 raise ValidationError(
#                     "Only admins and pharmacists can update order status."
#                 )
#         return value
