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
from payments.models import PaymentMethodChoices
import stripe
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction
import requests
import base64
import json
import logging
from datetime import datetime
from django.core.cache import cache
from products.models import Product, BranchStock, StockLog
from users.active_branch import get_active_branch, require_active_branch
from config.api_responses import ApiErrorCode, api_error, api_success
from .models import Order, OrderItem, OrderStatusChoices, OrderTemplate, OrderTemplateItem

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsPharmacistOrAdmin])
@transaction.atomic
def quick_sale(request):
    """
    Create a quick sale order without patient association.
    Deducts branch stock and writes StockLog + optional DispensingLog.
    """
    denied = require_active_branch(request)
    if denied:
        return denied

    active_branch = get_active_branch(request)

    try:
        logger.debug(f"Quick sale initiated by user {request.user.id} at branch {active_branch.id}")

        items = request.data.get('items', [])
        requested_payment_method = (request.data.get("payment_method") or "cash").strip().lower()
        payment_method_map = {
            "cash": PaymentMethodChoices.CASH_ON_DELIVERY,
            "till": PaymentMethodChoices.MPESA,
            "paybill": PaymentMethodChoices.MPESA,
            "mobile_money": PaymentMethodChoices.MPESA,
            "bank_transfer": PaymentMethodChoices.STRIPE,
            "card": PaymentMethodChoices.STRIPE,
            "other": PaymentMethodChoices.CASH_ON_DELIVERY,
            "mpesa": PaymentMethodChoices.MPESA,
            "stripe": PaymentMethodChoices.STRIPE,
            "cash_on_delivery": PaymentMethodChoices.CASH_ON_DELIVERY,
        }
        payment_method = payment_method_map.get(requested_payment_method, PaymentMethodChoices.CASH_ON_DELIVERY)
        
        customer_type = request.data.get("customer_type", "walk-in")
        patient_name = request.data.get("patient_name", "")
        credit_customer_id = request.data.get("credit_customer_id")
        pricing_tier = request.data.get("pricing_tier", "retail")
        
        if customer_type == "credit" and not credit_customer_id:
            return api_error(
                ApiErrorCode.VALIDATION_ERROR,
                "Credit customer ID is required for credit sales.",
            )
        if not items:
            return api_error(
                ApiErrorCode.VALIDATION_ERROR,
                "Add at least one product to complete the sale.",
            )

        order = Order.objects.create(
            user=request.user,
            branch=active_branch,
            status=OrderStatusChoices.DELIVERED,
            total_amount=0,
            customer_id=credit_customer_id if customer_type == "credit" else None,
            patient_name=patient_name if customer_type == "walk-in" else "",
        )

        total_amount = 0
        order_items = []

        for item in items:
            product_id = item.get('id')
            if not product_id:
                order.delete()
                return api_error(
                    ApiErrorCode.VALIDATION_ERROR,
                    "Product ID missing in cart item.",
                )
            quantity = int(item.get('quantity', 1) or 1)
            if quantity < 1:
                order.delete()
                return api_error(
                    ApiErrorCode.VALIDATION_ERROR,
                    "Quantity must be at least 1.",
                )

            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                order.delete()
                return api_error(
                    ApiErrorCode.PRODUCT_NOT_FOUND,
                    f"Product could not be found.",
                    details={"product_id": product_id},
                    http_status=status.HTTP_404_NOT_FOUND,
                )

            branch_stock, _ = BranchStock.objects.get_or_create(
                product=product,
                branch=active_branch,
                defaults={"quantity": 0, "reorder_level": 0},
            )
            available = branch_stock.quantity
            if available < quantity:
                order.delete()
                return api_error(
                    ApiErrorCode.INSUFFICIENT_STOCK,
                    f"{product.name} only has {available} units available at {active_branch.name}.",
                    details={
                        "product_name": product.name,
                        "available": available,
                        "requested": quantity,
                        "branch": active_branch.name,
                    },
                )

            unit_price = product.price
            if hasattr(product, "pricing_tier") and product.pricing_tier:
                if pricing_tier == "wholesale" and product.pricing_tier.wholesale_price:
                    unit_price = product.pricing_tier.wholesale_price
                else:
                    unit_price = product.pricing_tier.retail_price or unit_price

            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
            )
            order_items.append(order_item)

            prev_qty = branch_stock.quantity
            branch_stock.quantity -= quantity
            branch_stock.save(update_fields=["quantity"])

            StockLog.objects.create(
                product=product,
                branch=active_branch,
                logged_by=request.user,
                change_type="sale",
                change_amount=-quantity,
                previous_quantity=prev_qty,
                new_quantity=branch_stock.quantity,
                reason=f"Quick sale order #{order.id}",
            )

            try:
                from dispensing_logs.models import DispensingLog
                DispensingLog.objects.create(
                    product=product,
                    quantity=quantity,
                    dispensed_by=request.user,
                    order=order,
                    previous_stock=prev_qty,
                    new_stock=branch_stock.quantity,
                    total_cost=order_item.subtotal,
                    notes=f"Quick sale at {active_branch.name}",
                )
            except Exception as log_exc:
                logger.warning("DispensingLog skipped: %s", log_exc)

            total_amount += order_item.subtotal

        order.total_amount = total_amount
        order.save(update_fields=["total_amount"])

        try:
            if customer_type == "credit" and credit_customer_id:
                customer_user = User.objects.get(id=credit_customer_id)
                customer_user.credit_balance += total_amount
                customer_user.save(update_fields=["credit_balance"])
                
                from users.models import CustomerDebtTransaction
                CustomerDebtTransaction.objects.create(
                    customer=customer_user,
                    transaction_type='SALE_ON_CREDIT',
                    amount=total_amount,
                    balance_after=customer_user.credit_balance,
                    description=f"Credit sale for Order #{order.id}",
                    branch=active_branch,
                    created_by=request.user
                )
                
                Payment.objects.create(
                    order=order,
                    method="credit",
                    amount=total_amount,
                    status="pending",
                    reference=f"CREDIT-{order.id}",
                    notes="Credit Sale"
                )
            else:
                Payment.objects.create(
                    order=order,
                    method=payment_method,
                    amount=total_amount,
                    status="completed",
                    reference=f"{requested_payment_method.upper()}-{order.id}",
                    notes=f"Requested payment method: {requested_payment_method}",
                )
        except Exception as pay_exc:
            logger.error("Payment record failed for order %s: %s", order.id, pay_exc)
            order.delete()
            return api_error(
                ApiErrorCode.VALIDATION_ERROR,
                "Sale could not be recorded. Please try again.",
            )

        branch = active_branch
        pharmacy = getattr(branch, 'pharmacy', None)
        payload = {
            "id": order.id,
            "total_amount": float(total_amount),
            "created_at": order.created_at.isoformat(),
            "branch_name": getattr(branch, 'name', None) or "Transcounty Main",
            "branch_contact_phone": getattr(branch, 'contact_phone', None) or "+254726246981",
            "branch_address": getattr(branch, 'address', None) or "Modern Building - Laini Moja Kitale",
            "branch_email": getattr(pharmacy, 'email', None) or "transcountypharm@yahoo.com",
            "branch_tagline": getattr(pharmacy, 'tagline', None) or "Dealers in Human Drugs & Surgical products",
            "user_full_name": request.user.get_full_name() or request.user.username,
            "items": [
                {
                    "product_id": oi.product.id,
                    "product_name": oi.product.name,
                    "quantity": oi.quantity,
                    "unit_price": float(oi.unit_price),
                    "total_price": float(oi.subtotal),
                }
                for oi in order_items
            ],
        }
        return api_success(
            f"Sale complete. Total: KES {total_amount:.2f}.",
            data=payload,
            extra=payload,
            http_status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error("Quick sale error: %s", e, exc_info=True)
        return api_error(
            ApiErrorCode.VALIDATION_ERROR,
            "Something went wrong while processing the sale. Please try again.",
            http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
        from django.db.models import Prefetch
        queryset = (
            Order.objects
            .select_related("user", "payment")
            .prefetch_related(
                Prefetch("items__product")
            )
            .order_by("-created_at")
        )
        # Filter by user if specified
        user_id = self.request.query_params.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
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
    permission_classes = [IsOrderOwner]

    def get_queryset(self):
        from django.db.models import Prefetch
        
        if not self.request.user.is_authenticated:
            return Order.objects.none()
        
        queryset = (
            Order.objects
            .select_related("user", "payment")
            .prefetch_related(Prefetch("items__product"))
        )
        # Customers see only their orders
        if self.request.user.role == "customer":
            return queryset.filter(user=self.request.user)
        # Pharmacists/admins see all
        elif self.request.user.role in ["pharmacist", "admin"]:
            return queryset
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
    from django.db.models import Prefetch
    
    if not request.user.is_authenticated:
        orders = Order.objects.none()
    elif request.user.role == "customer":
        orders = (
            Order.objects
            .filter(user=request.user)
            .select_related("user", "payment")
            .prefetch_related(Prefetch("items__product"))
            .order_by("-created_at")
        )
    elif request.user.role in ["pharmacist", "admin"]:
        orders = (
            Order.objects.all()
            .select_related("user", "payment")
            .prefetch_related(Prefetch("items__product"))
            .order_by("-created_at")
        )
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
    payments = (
        Payment.objects
        .filter(order__user=request.user)
        .select_related("order")
        .order_by("-created_at")
    )
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
            status=status.HTTP_404_NOT_FOUND,
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


@require_http_methods(["POST"])
def mpesa_callback(request):
    """
    DEPRECATED: Use payments.views.mpesa_callback instead for secure webhook handling.
    This endpoint is kept for backward compatibility only.
    """
    logger.warning("M-Pesa callback received on deprecated endpoint (orders.views). Use payments.views instead.")
    try:
        callback_data = json.loads(request.body)
        logger.debug("M-Pesa callback received (deprecated endpoint)")

        # Process each transaction
        for result in callback_data.get("Body", {}).get("stkCallback", {}).get("CallbackMetadata", []) or []:
            if result.get("Name") == "ResultCode":
                result_code = result.get("Value")
                if result_code == 0:  # Success
                    # Extract details
                    amount = None
                    receipt = None
                    tx_time = None
                    phone = None
                    for item in callback_data["Body"]["stkCallback"].get("CallbackMetadata", []):
                        if item["Name"] == "Amount":
                            amount = item["Value"]
                        elif item["Name"] == "MpesaReceiptNumber":
                            receipt = item["Value"]
                        elif item["Name"] == "TransactionDate":
                            timestamp = int(item["Value"]) / 1000
                            tx_time = datetime.fromtimestamp(timestamp)
                        elif item["Name"] == "PhoneNumber":
                            phone = item["Value"]

                    # Find payment by CheckoutRequestID
                    checkout_id = callback_data["Body"]["stkCallback"].get("CheckoutRequestID")
                    try:
                        payment = Payment.objects.get(reference=checkout_id, method="mpesa")
                        payment.status = "completed"
                        payment.reference = receipt  # Update to receipt number
                        payment.transaction_date = tx_time
                        payment.save()

                        # Update order
                        payment.order.status = "paid"
                        payment.order.save()
                        logger.info(f"M-Pesa payment completed (deprecated endpoint): receipt={receipt}")
                    except Payment.DoesNotExist:
                        logger.error(f"Payment not found for checkout_id {checkout_id}")

                else:
                    error_msg = callback_data["Body"]["stkCallback"].get("ResultDesc", "Payment failed")
                    checkout_id = callback_data["Body"]["stkCallback"].get("CheckoutRequestID")
                    try:
                        payment = Payment.objects.get(reference=checkout_id, method="mpesa")
                        payment.status = "failed"
                        payment.save()
                        logger.warning(f"M-Pesa payment failed: {error_msg}")
                    except Payment.DoesNotExist:
                        logger.error(f"Payment not found for failed checkout_id {checkout_id}")

        return JsonResponse({"ResultCode": 0, "ResultDesc": "Success"})
    except Exception as e:
        logger.error(f"M-Pesa callback error (deprecated endpoint): {str(e)}", exc_info=True)
        return JsonResponse(
            {"ResultCode": 1, "ResultDesc": "Processing error"},
            status=500
        )


@require_http_methods(["POST"])
def stripe_webhook(request):
    """
    DEPRECATED: Use payments.views.stripe_webhook instead for secure webhook handling.
    This endpoint is kept for backward compatibility only.
    """
    logger.warning("Stripe webhook received on deprecated endpoint (orders.views). Use payments.views instead.")
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    if not endpoint_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        return JsonResponse({"error": "Webhook not configured"}, status=500)

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except ValueError as e:
        logger.warning(f"Invalid Stripe webhook payload: {str(e)}")
        return JsonResponse({"error": "Invalid payload"}, status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.warning(f"Invalid Stripe webhook signature: {str(e)}")
        return JsonResponse({"error": "Invalid signature"}, status=401)

    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        reference = payment_intent["id"]
        order_id = payment_intent.get("metadata", {}).get("order_id")

        try:
            payment = Payment.objects.get(reference=reference, method="stripe")
            payment.status = "completed"
            payment.updated_at = timezone.now()
            payment.save()

            order = payment.order
            order.status = "paid"
            order.save()

            logger.info(f"Stripe payment completed (deprecated endpoint): order_id={order_id}, reference={reference}")

        except Payment.DoesNotExist:
            logger.error(f"Payment not found for Stripe reference {reference}")
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


from django.http import FileResponse
from utils.pdf_generator import PDFGenerator

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_receipt_pdf(request, pk):
    """
    Generate and return a PDF receipt for a specific order.
    """
    order = get_object_or_404(Order, pk=pk)
    
    # Permission check: must be owner or staff
    if request.user.role == "customer" and order.user != request.user:
        return Response(
            {"error": "You do not have permission to view this receipt."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    generator = PDFGenerator()
    pdf_buffer = generator.generate_receipt(order)

    branch_name = order.branch.name if order.branch and order.branch.name else "Transcounty Main"
    payment_method = (
        order.payment.method
        if order.payment and getattr(order.payment, "method", None)
        else "unknown"
    )
    safe_branch_name = slugify(branch_name).replace('-', '_') or "transcounty_main"
    safe_payment_method = slugify(payment_method).replace('-', '_') or "unknown"
    receipt_date = order.created_at.strftime("%Y%m%d") if order.created_at else timezone.now().strftime("%Y%m%d")
    filename = (
        f"{safe_branch_name}_receipt_{order.id}_"
        f"{safe_payment_method}_{receipt_date}.pdf"
    )
    return FileResponse(
        pdf_buffer,
        as_attachment=True,
        filename=filename,
        content_type='application/pdf'
    )

from rest_framework import viewsets
from .serializers import OrderTemplateSerializer

class OrderTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Order Templates.
    """
    serializer_class = OrderTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return OrderTemplate.objects.none()
            
        qs = OrderTemplate.objects.all()
        
        # Customers can only see their templates (where customer_name matches or if linked directly)
        if self.request.user.role == 'customer':
            qs = qs.filter(created_by=self.request.user)
            
        return qs
        
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
