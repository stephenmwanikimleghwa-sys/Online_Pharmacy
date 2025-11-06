from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderCreateSerializer, OrderUpdateSerializer
from payments.serializers import PaymentSerializer, PaymentInitiateSerializer
from users.permissions import IsPharmacistOrAdmin, IsOwnerOrAdmin

# Pharmacy import removed - single pharmacy app
from users.models import User
from payments.models import Payment
import stripe
from django.conf import settings
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import requests
import base64
import json
from datetime import datetime
from django.core.cache import cache
from products.models import Product
from .models import Order, OrderItem, OrderStatusChoices


@api_view(['POST'])
@permission_classes([IsPharmacistOrAdmin])
def quick_sale(request):
    """
    Create a quick sale order without patient association.
    Only for pharmacists and admins.
    """
    try:
        print("Quick sale request data:", request.data)
        # Validate input data
        items = request.data.get('items', [])
        if not items:
            return Response(
                {'error': 'No items provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create order
        order = Order.objects.create(
            user=request.user,  # The staff member who made the sale
            status=OrderStatusChoices.DELIVERED,  # Quick sales are delivered immediately
            total_amount=0  # Will be calculated from items
        )

        total_amount = 0
        order_items = []

        # Process each item
        for item in items:
            print("Processing item:", item)
            product_id = item.get('id')
            if not product_id:
                order.delete()
                return Response(
                    {'error': 'Product ID missing in item'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            quantity = item.get('quantity', 1)

            try:
                print(f"Looking for product with ID: {product_id}")
                product = Product.objects.get(id=product_id)
                print(f"Found product: {product.name}")
            except Product.DoesNotExist:
                # Rollback on error
                order.delete()
                return Response(
                    {'error': f'Product with ID {product_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            if product.stock_quantity < quantity:
                # Rollback on insufficient stock
                order.delete()
                return Response(
                    {'error': f'Insufficient stock for product {product.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create order item
            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                unit_price=product.price
            )
            order_items.append(order_item)

            # Record previous stock for logging
            previous_stock = product.stock_quantity
            
            # Update product stock
            product.stock_quantity -= quantity
            product.save()

            # Create dispensing log with defensive logging and rollback on failure
            try:
                from dispensing_logs.models import DispensingLog
                dispenser_name = (
                    request.user.get_full_name() if hasattr(request.user, 'get_full_name') else str(request.user)
                )
                print(f"Creating DispensingLog: product={product.id} quantity={quantity} prev_stock={previous_stock} new_stock={product.stock_quantity} total_cost={order_item.subtotal} dispensed_by={dispenser_name}")
                DispensingLog.objects.create(
                    product=product,
                    quantity=quantity,
                    dispensed_by=request.user,
                    order=order,
                    previous_stock=previous_stock,
                    new_stock=product.stock_quantity,
                    total_cost=order_item.subtotal,
                    notes=f"Quick sale by {dispenser_name}"
                )
            except Exception as log_exc:
                import traceback as _tb
                print(f"Failed to create DispensingLog for product {product.id}: {str(log_exc)}")
                _tb.print_exc()
                # Rollback order to avoid inconsistent state
                try:
                    order.delete()
                except Exception:
                    pass
                return Response({'error': 'Failed to record dispensing log'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            item_subtotal = order_item.subtotal
            total_amount += item_subtotal

        # Update order total
        order.total_amount = total_amount
        order.save()

        # Create a completed cash payment record
        try:
            Payment.objects.create(
                order=order,
                method='cash',
                amount=total_amount,
                status='completed',
                reference=f'CASH-{order.id}'
            )
        except Exception as pay_exc:
            import traceback as _tb
            print(f"Failed to create Payment record for order {order.id}: {str(pay_exc)}")
            _tb.print_exc()
            try:
                order.delete()
            except Exception:
                pass
            return Response({'error': 'Failed to create payment record'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'id': order.id,
            'total_amount': total_amount,
            'items': [{
                'product_id': item.product.id,
                'product_name': item.product.name,
                'quantity': item.quantity,
                'unit_price': item.unit_price,
                'total_price': item.subtotal
            } for item in order_items]
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f'Quick sale error: {str(e)}')
        print('Full traceback:')
        traceback.print_exc()
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class IsOrderOwner(permissions.BasePermission):
    """
    Custom permission to check if user owns the order or is admin/pharmacist.
    Customers see own orders; pharmacists/admins see all.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role in ["admin", "pharmacist"]:
            return True
        if obj.user == request.user:
            return True
        return False


class OrderListCreateView(generics.ListCreateAPIView):
    """
    List all orders with filtering (by user, status).
    Create a new order (authenticated customers only).
    """

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Order.objects.select_related("user", "payment").order_by(
            "-created_at"
        )
        # Filter by user if specified
        user_id = self.request.query_params.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        # Filter by status
        status = self.request.query_params.get("status")
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]  # Customers can create
        return [permissions.IsAuthenticatedOrReadOnly()]  # All can list with auth

    def get_serializer_class(self):
        if self.request.method == "POST":
            return OrderCreateSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OrderRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific order.
    Customers can view their own orders.
    Pharmacists/admins can manage all.
    """

    serializer_class = OrderUpdateSerializer
    lookup_field = "pk"
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Order.objects.none()
        # Customers see only their orders
        if self.request.user.role == "customer":
            return Order.objects.filter(user=self.request.user)
        # Pharmacists/admins see all
        elif self.request.user.role in ["pharmacist", "admin"]:
            return Order.objects.all()
        return Order.objects.none()

    def get_object(self):
        obj = super().get_object()
        # Permission check: user must own the order, or be pharmacist/admin
        if self.request.user.is_authenticated:
            if self.request.user.role == "customer" and obj.user != self.request.user:
                self.permission_denied(self.request)
        return obj


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_orders(request):
    """
    List orders for the authenticated user (customer or pharmacist/admin).
    Customers see their own orders.
    Pharmacists/admins see all orders.
    """
    if not request.user.is_authenticated:
        orders = Order.objects.none()
    elif request.user.role == "customer":
        orders = Order.objects.filter(user=request.user).order_by("-created_at")
    elif request.user.role in ["pharmacist", "admin"]:
        orders = Order.objects.all().order_by("-created_at")
    else:
        orders = Order.objects.none()
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_payments(request):
    """
    List payments for the authenticated user.
    """
    payments = Payment.objects.filter(order__user=request.user).order_by("-created_at")
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def initiate_stripe_payment(request):
    """
    Initiate a Stripe payment for an order.
    Expects order_id and amount in request data.
    """
    serializer = PaymentInitiateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    order_id = serializer.validated_data["order_id"]
    amount = serializer.validated_data["amount"]  # In KES, convert to cents for Stripe

    try:
        order = Order.objects.get(id=order_id, user=request.user, status="pending")
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found or not pending."},
            status=status.HTTP_404_NOT_CONTENT,
        )

    # Create Stripe Payment Intent
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Stripe uses cents
            currency="kes",
            metadata={"order_id": str(order_id)},
        )
        # Create Payment record
        payment = Payment.objects.create(
            order=order,
            method="stripe",
            amount=amount,
            status="initiated",
            reference=intent.id,
        )
        payment.save()

        return Response(
            {
                "client_secret": intent.client_secret,
                "payment_id": payment.id,
            },
            status=status.HTTP_200_OK,
        )
    except stripe.error.StripeError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def initiate_mpesa_payment(request):
    """
    Initiate M-Pesa STK Push for an order.
    """
    serializer = PaymentInitiateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    order_id = serializer.validated_data["order_id"]
    amount = serializer.validated_data["amount"]
    phone_number = request.user.phone_number  # Assume user has phone

    if not phone_number or not phone_number.startswith("+"):
        return Response(
            {"error": "Valid phone number required for M-Pesa."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        order = Order.objects.get(id=order_id, user=request.user, status="pending")
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found or not pending."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Get access token
    try:
        access_token = get_mpesa_access_token()
    except Exception as e:
        return Response(
            {"error": f"M-Pesa authentication failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Prepare STK Push payload
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
    ).decode()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": str(int(amount)),
        "PartyA": phone_number.replace("+", ""),
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone_number.replace("+", ""),
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": f"Order {order_id}",
        "TransactionDesc": "Payment for pharmacy order",
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    response = requests.post(settings.MPESA_LIPA_URL, json=payload, headers=headers)
    response_data = response.json()

    if response.status_code == 200:
        checkout_request_id = response_data.get("CheckoutRequestID")
        # Create Payment record
        payment = Payment.objects.create(
            order=order,
            method="mpesa",
            amount=amount,
            status="initiated",
            reference=checkout_request_id,
        )
        payment.save()

        return Response(
            {
                "message": "M-Pesa STK Push initiated. Check your phone for PIN prompt.",
                "checkout_request_id": checkout_request_id,
                "payment_id": payment.id,
            },
            status=status.HTTP_200_OK,
        )
    else:
        return Response(
            {"error": "Failed to initiate M-Pesa payment.", "response": response_data},
            status=status.HTTP_400_BAD_REQUEST,
        )


def get_mpesa_access_token():
    """
    Get M-Pesa OAuth access token (cached for 1 hour).
    """
    cache_key = "mpesa_access_token"
    token = cache.get(cache_key)
    if token:
        return token

    # Base64 encode consumer key and secret
    credentials = base64.b64encode(
        f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}".encode()
    ).decode()

    headers = {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
    }

    response = requests.get(settings.MPESA_OAUTH_URL, headers=headers)
    if response.status_code == 200:
        data = response.json()
        token = data["access_token"]
        cache.set(cache_key, token, 3600)  # Cache for 1 hour
        return token
    else:
        raise Exception(f"Failed to get M-Pesa token: {response.text}")


@csrf_exempt
@require_http_methods(["POST"])
def mpesa_callback(request):
    """
    Handle M-Pesa callback (asynchronous validation).
    """
    try:
        callback_data = json.loads(request.body)
        print(f"M-Pesa Callback: {callback_data}")

        # Process each transaction
        for result in callback_data["Body"]["stkCallback"]["CallbackMetadata"] or []:
            if result["Name"] == "ResultCode":
                result_code = result["Value"]
                if result_code == 0:  # Success
                    # Extract details
                    for item in callback_data["Body"]["stkCallback"][
                        "CallbackMetadata"
                    ]:
                        if item["Name"] == "Amount":
                            amount = item["Value"]
                        elif item["Name"] == "MpesaReceiptNumber":
                            receipt = item["Value"]
                        elif item["Name"] == "TransactionDate":
                            # Convert timestamp
                            timestamp = int(item["Value"]) / 1000
                            tx_time = datetime.fromtimestamp(timestamp)
                        elif item["Name"] == "PhoneNumber":
                            phone = item["Value"]

                    # Find payment by CheckoutRequestID
                    checkout_id = callback_data["Body"]["stkCallback"][
                        "CheckoutRequestID"
                    ]
                    payment = Payment.objects.get(reference=checkout_id, method="mpesa")

                    payment.status = "completed"
                    payment.reference = receipt  # Update to receipt number
                    payment.transaction_date = tx_time
                    payment.save()

                    # Update order
                    payment.order.status = "paid"
                    payment.order.save()

                    # Trigger fulfillment (e.g., email, Celery task)
                    # send_order_confirmation(payment.order)

                else:
                    # Handle failure
                    error_msg = callback_data["Body"]["stkCallback"].get(
                        "ResultDesc", "Payment failed"
                    )
                    checkout_id = callback_data["Body"]["stkCallback"][
                        "CheckoutRequestID"
                    ]
                    payment = Payment.objects.get(reference=checkout_id, method="mpesa")
                    payment.status = "failed"
                    payment.save()

        return JsonResponse({"ResultCode": 1, "ResultDesc": "Accepted"})
    except Exception as e:
        print(f"M-Pesa callback error: {str(e)}")
        return JsonResponse(
            {"ResultCode": 1, "ResultDesc": "Accepted"}
        )  # Acknowledge anyway


@csrf_exempt
@require_http_methods(["POST"])
def stripe_webhook(request):
    """
    Handle Stripe webhook for payment confirmation.
    """
    payload = request.body
    sig_header = request.META["HTTP_STRIPE_SIGNATURE"]
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET  # Add to .env

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except ValueError:
        return JsonResponse({"error": "Invalid payload"}, status=400)
    except stripe.error.SignatureVerificationError:
        return JsonResponse({"error": "Invalid signature"}, status=400)

    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        reference = payment_intent["id"]
        order_id = payment_intent["metadata"]["order_id"]

        try:
            payment = Payment.objects.get(reference=reference, method="stripe")
            payment.status = "completed"
            payment.updated_at = timezone.now()
            payment.save()

            order = payment.order
            order.status = "paid"
            order.save()

            # Trigger order fulfillment (e.g., email, Celery task)
            # send_order_confirmation(order)

        except Payment.DoesNotExist:
            return JsonResponse({"error": "Payment not found"}, status=404)

    return JsonResponse({"status": "success"}, status=200)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def payment_detail(request, pk):
    """
    Get details of a specific payment.
    """
    try:
        payment = Payment.objects.get(id=pk, order__user=request.user)
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)
    except Payment.DoesNotExist:
        return Response(
            {"error": "Payment not found."}, status=status.HTTP_404_NOT_FOUND
        )


# Additional utility views can be added here, e.g., refund processing for admins
