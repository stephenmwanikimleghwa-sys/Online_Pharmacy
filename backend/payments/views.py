from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.conf import settings
from django.views.decorators.http import require_POST
import stripe
import requests
import json
import logging
import hmac
import hashlib
from datetime import datetime
from .models import Payment
from orders.models import Order
from .serializers import PaymentSerializer
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.cache import cache
import base64

logger = logging.getLogger(__name__)

# Set Stripe key from settings
stripe.api_key = settings.STRIPE_SECRET_KEY

# M-Pesa configuration from settings
MPESA_CONSUMER_KEY = settings.MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET = settings.MPESA_CONSUMER_SECRET
MPESA_SHORTCODE = settings.MPESA_SHORTCODE
MPESA_PASSKEY = settings.MPESA_PASSKEY
MPESA_CALLBACK_URL = settings.MPESA_CALLBACK_URL
MPESA_OAUTH_URL = settings.MPESA_OAUTH_URL
MPESA_LIPA_URL = settings.MPESA_LIPA_URL


def get_mpesa_access_token():
    """
    Get M-Pesa OAuth access token (cached for 1 hour).

    Returns:
        str: Access token for M-Pesa API

    Raises:
        Exception: If token retrieval fails
    """
    cache_key = "mpesa_access_token"
    token = cache.get(cache_key)
    if token:
        return token

    if not MPESA_CONSUMER_KEY or not MPESA_CONSUMER_SECRET:
        raise Exception("M-Pesa credentials not configured")

    # Base64 encode consumer key and secret
    credentials = base64.b64encode(
        f"{MPESA_CONSUMER_KEY}:{MPESA_CONSUMER_SECRET}".encode()
    ).decode()

    headers = {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.get(MPESA_OAUTH_URL, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                cache.set(cache_key, token, 3600)  # Cache for 1 hour
                logger.info("M-Pesa access token obtained successfully")
                return token
        logger.error(f"M-Pesa token request failed: status={response.status_code}")
        raise Exception(f"Failed to get M-Pesa token: {response.status_code}")
    except requests.RequestException as e:
        logger.error(f"M-Pesa token request error: {str(e)}")
        raise Exception(f"Failed to get M-Pesa token: {str(e)}")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_stripe_payment(request):
    """
    Initiate a Stripe payment for an order.
    """
    order_id = request.data.get("order_id")
    amount = request.data.get("amount")

    if not order_id or not amount:
        return Response(
            {"error": "order_id and amount are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        order = Order.objects.get(id=order_id, user=request.user, status="pending")
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found or not pending."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Create Stripe PaymentIntent
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
        logger.info(f"Stripe payment initiated: order_id={order_id}, payment_id={payment.id}")

        return Response(
            {
                "client_secret": intent.client_secret,
                "payment_id": payment.id,
            },
            status=status.HTTP_200_OK,
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error for order {order_id}: {str(e)}")
        return Response(
            {"error": "Payment processing failed. Please try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_mpesa_payment(request):
    """
    Initiate M-Pesa STK Push for an order.
    """
    order_id = request.data.get("order_id")
    amount = request.data.get("amount")
    phone_number = request.data.get("phone_number")

    if not order_id or not amount or not phone_number:
        return Response(
            {"error": "order_id, amount, and phone_number are required."},
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
        logger.error(f"M-Pesa authentication failed: {str(e)}")
        return Response(
            {"error": "Payment service temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Prepare STK Push payload
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{MPESA_SHORTCODE}{MPESA_PASSKEY}{timestamp}".encode()
    ).decode()

    payload = {
        "BusinessShortCode": MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": str(int(amount)),
        "PartyA": phone_number.replace("+", ""),
        "PartyB": MPESA_SHORTCODE,
        "PhoneNumber": phone_number.replace("+", ""),
        "CallBackURL": MPESA_CALLBACK_URL,
        "AccountReference": f"Order {order_id}",
        "TransactionDesc": "Payment for pharmacy order",
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(MPESA_LIPA_URL, json=payload, headers=headers, timeout=10)
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

            logger.info(f"M-Pesa payment initiated: order_id={order_id}, checkout_id={checkout_request_id}")

            return Response(
                {
                    "message": "M-Pesa STK Push initiated. Check your phone for PIN prompt.",
                    "checkout_request_id": checkout_request_id,
                    "payment_id": payment.id,
                },
                status=status.HTTP_200_OK,
            )
        else:
            logger.error(f"M-Pesa API error for order {order_id}: {response_data}")
            return Response(
                {"error": "Failed to initiate payment. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except requests.RequestException as e:
        logger.error(f"M-Pesa request failed for order {order_id}: {str(e)}")
        return Response(
            {"error": "Payment service error. Please try again."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def _verify_mpesa_signature(request_body: bytes, signature: str) -> bool:
    """
    Verify M-Pesa callback signature using MPESA_PASSKEY.

    Args:
        request_body: Raw request body
        signature: Signature from M-Pesa

    Returns:
        True if signature is valid, False otherwise
    """
    if not MPESA_PASSKEY:
        logger.warning("MPESA_PASSKEY not configured - cannot verify callback signature")
        return False

    try:
        expected_signature = base64.b64encode(
            hmac.new(
                MPESA_PASSKEY.encode(),
                request_body,
                hashlib.sha256
            ).digest()
        ).decode()

        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        logger.error(f"Error verifying M-Pesa signature: {str(e)}")
        return False


@require_POST
@csrf_protect
def mpesa_callback(request):
    """
    Handle M-Pesa callback with signature verification.
    CSRF is protected - M-Pesa must include proper tokens or use X-CSRF-TOKEN header.
    """
    try:
        # Verify signature from M-Pesa (try both header name variations)
        signature = request.headers.get('X-M-Pesa-Signature', '') or request.headers.get('X-MPesa-Signature', '')
        if not signature or not _verify_mpesa_signature(request.body, signature):
            logger.warning("M-Pesa callback received with invalid signature")
            return JsonResponse(
                {"ResultCode": 1, "ResultDesc": "Invalid signature"},
                status=401
            )

        callback_data = json.loads(request.body)
        logger.info("M-Pesa callback received and verified")

        # Process each transaction
        callback_metadata = callback_data.get("Body", {}).get("stkCallback", {}).get("CallbackMetadata", [])
        for result in callback_metadata or []:
            try:
                if result.get("ResultCode") == 0:  # Success
                    receipt = result.get("MpesaReceiptNumber", "")
                    amount = result.get("Amount", 0)
                    phone = result.get("PhoneNumber", "")
                    account_ref = result.get("AccountReference", "")

                    try:
                        order_id = account_ref.replace("Order ", "")
                        payment = Payment.objects.get(reference=receipt, method="mpesa")
                        payment.status = "completed"
                        payment.transaction_date = timezone.now()
                        payment.save()

                        order = payment.order
                        order.status = "paid"
                        order.save()

                        logger.info(f"M-Pesa payment completed: order_id={order_id}, receipt={receipt}")

                    except Payment.DoesNotExist:
                        logger.error(f"Payment not found for receipt {receipt}")
                else:
                    error_code = result.get("ResultCode", "unknown")
                    error_desc = result.get("ResultDesc", "Unknown error")
                    logger.warning(f"M-Pesa transaction failed: code={error_code}, desc={error_desc}")

            except Exception as e:
                logger.error(f"Error processing M-Pesa transaction: {str(e)}", exc_info=True)
                continue

        return JsonResponse({"ResultCode": 0, "ResultDesc": "Success"})

    except json.JSONDecodeError:
        logger.error("Invalid JSON in M-Pesa callback")
        return JsonResponse(
            {"ResultCode": 1, "ResultDesc": "Invalid JSON"},
            status=400
        )
    except Exception as e:
        logger.error(f"M-Pesa callback error: {str(e)}", exc_info=True)
        return JsonResponse(
            {"ResultCode": 1, "ResultDesc": "Processing error"},
            status=500
        )


@require_POST
@csrf_protect
def stripe_webhook(request):
    """
    Handle Stripe webhook for payment confirmation.
    Requires valid Stripe signature header.
    """
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    if not endpoint_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        return JsonResponse({"error": "Webhook not configured"}, status=500)

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)

        if event["type"] == "payment_intent.succeeded":
            payment_intent = event["data"]["object"]
            reference = payment_intent["id"]
            order_id = payment_intent.get("metadata", {}).get("order_id")

            try:
                payment = Payment.objects.get(reference=reference, method="stripe")
                payment.status = "completed"
                payment.transaction_date = timezone.now()
                payment.save()

                order = payment.order
                order.status = "paid"
                order.save()

                logger.info(f"Stripe payment completed: order_id={order_id}, reference={reference}")

            except Payment.DoesNotExist:
                logger.error(f"Payment not found for Stripe ID {reference}")

        return JsonResponse({"status": "success"}, status=200)

    except stripe.error.SignatureVerificationError as e:
        logger.warning(f"Invalid Stripe signature: {str(e)}")
        return JsonResponse({"error": "Invalid signature"}, status=401)
    except json.JSONDecodeError:
        logger.error("Invalid JSON in Stripe webhook")
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        logger.error(f"Stripe webhook error: {str(e)}", exc_info=True)
        return JsonResponse({"error": "Webhook processing error"}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_status(request, pk):
    """
    Retrieve payment status for a specific payment by ID.
    Only the order owner can access.
    """
    payment = get_object_or_404(Payment, id=pk, order__user=request.user)
    serializer = PaymentSerializer(payment)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_payments(request):
    """
    List payments for the authenticated user.
    """
    payments = Payment.objects.filter(order__user=request.user).order_by("-created_at")
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)
