# from rest_framework import serializers
# from .models import Payment, PaymentMethodChoices, PaymentStatusChoices
# from orders.models import Order
# from django.core.exceptions import ValidationError
# from django.core.validators import MinValueValidator
# 
# 
# class PaymentInitiateSerializer(serializers.Serializer):
#     """
#     Serializer for initiating a payment.
#     Used when creating a payment for an order.
#     """
# 
#     order_id = serializers.IntegerField()
#     amount = serializers.DecimalField(
#         max_digits=10,
#         decimal_places=2,
#         validators=[MinValueValidator(0.01)],
#     )
#     method = serializers.ChoiceField(choices=PaymentMethodChoices.choices)
#     phone_number = serializers.CharField(
#         max_length=15, required=False, allow_blank=True
#     )  # For M-Pesa
#     card_token = serializers.CharField(required=False, allow_blank=True)  # For Stripe
# 
#     def validate_order_id(self, value):
#         try:
#             order = Order.objects.get(id=value, status="pending")
#         except Order.DoesNotExist:
#             raise serializers.ValidationError("Invalid or non-pending order.")
#         return value
# 
#     def validate(self, attrs):
#         method = attrs.get("method")
#         if method == PaymentMethodChoices.MPESA and not attrs.get("phone_number"):
#             raise serializers.ValidationError(
#                 "Phone number is required for M-Pesa payments."
#             )
#         if method == PaymentMethodChoices.STRIPE and not attrs.get("card_token"):
#             raise serializers.ValidationError(
#                 "Card token is required for Stripe payments."
#             )
#         return attrs
# 
# 
# class PaymentSerializer(serializers.ModelSerializer):
#     """
#     Serializer for payment details (read-only for users).
#     """
# 
#     order = serializers.HyperlinkedRelatedField(
#         view_name="order-detail", read_only=True
#     )
#     method_display = serializers.CharField(source="get_method_display", read_only=True)
# 
#     class Meta:
#         model = Payment
#         fields = (
#             "id",
#             "order",
#             "method",
#             "method_display",
#             "amount",
#             "status",
#             "reference",
#             "created_at",
#             "updated_at",
#         )
#         read_only_fields = ("id", "status", "reference", "created_at", "updated_at")
# 
# 
# class PaymentCallbackSerializer(serializers.Serializer):
#     """
#     Serializer for handling payment callbacks/webhooks from M-Pesa or Stripe.
#     Validates gateway-specific data.
#     """
# 
#     # Common fields
#     reference = serializers.CharField(max_length=100)
#     status = serializers.ChoiceField(choices=PaymentStatusChoices.choices)
#     amount = serializers.DecimalField(max_digits=10, decimal_places=2)
# 
#     # M-Pesa specific
#     mpesa_receipt = serializers.CharField(max_length=50, required=False)
#     transaction_id = serializers.CharField(max_length=100, required=False)
# 
#     # Stripe specific
#     stripe_charge_id = serializers.CharField(max_length=100, required=False)
# 
#     def validate(self, attrs):
#         method = self.context.get("method")  # Set in view
#         if method == PaymentMethodChoices.MPESA:
#             if not attrs.get("mpesa_receipt") or not attrs.get("transaction_id"):
#                 raise serializers.ValidationError(
#                     "M-Pesa receipt and transaction ID are required."
#                 )
#         elif method == PaymentMethodChoices.STRIPE:
#             if not attrs.get("stripe_charge_id"):
#                 raise serializers.ValidationError("Stripe charge ID is required.")
#         return attrs
