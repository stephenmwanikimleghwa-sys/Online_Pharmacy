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
import hmac
import hashlib
import structlog
from datetime import datetime
from .models import Payment
from orders.models import Order
from .serializers import PaymentSerializer
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.cache import cache
import base64
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from django_ratelimit.decorators import ratelimit
from users.utils import log_activity, sanitize_log_input

logger = structlog.get_logger(__name__)

# Set Stripe key and network retries globally
stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.max_network_retries = 2

# M-Pesa configuration from settings
MPESA_CONSUMER_KEY = settings.MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET = settings.MPESA_CONSUMER_SECRET
MPESA_SHORTCODE = settings.MPESA_SHORTCODE
MPESA_PASSKEY = settings.MPESA_PASSKEY
MPESA_CALLBACK_URL = settings.MPESA_CALLBACK_URL
MPESA_OAUTH_URL = settings.MPESA_OAUTH_URL
MPESA_LIPA_URL = settings.MPESA_LIPA_URL

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=(retry_if_exception_type(requests.RequestException) | retry_if_exception_type(Exception))
)
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
                logger.info("mpesa_token_obtained_successfully")
                return token
        logger.error("mpesa_token_request_failed", status=response.status_code)
        raise Exception(f"Failed to get M-Pesa token: {response.status_code}")
    except requests.RequestException as e:
        safe_err = sanitize_log_input(str(e))
        logger.error("mpesa_token_request_error", error=safe_err)
        raise Exception(f"Failed to get M-Pesa token: {str(e)}")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='5/m', block=True)
def initiate_stripe_payment(request):
    """
    Initiate a Stripe payment for an order.
    """
    order_id = request.data.get("order_id")

    if not order_id:
        return Response(
            {"error": "order_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        order = Order.objects.get(id=order_id, user=request.user, status="pending")
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found or not pending."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Amount is always derived server-side from the order total. Never trust a
    # client-supplied amount — doing so would allow paying an arbitrary price.
    amount = order.total_amount
    if amount is None or amount <= 0:
        return Response(
            {"error": "Order has no payable amount."},
            status=status.HTTP_400_BAD_REQUEST,
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

        log_activity(
            user=request.user,
            event_type='PAYMENT_INITIATED',
            ip_address=request.META.get('REMOTE_ADDR'),
            details_dict={'payment_method': 'stripe', 'order_id': order_id, 'amount': amount, 'payment_id': payment.id}
        )

        logger.info("stripe_payment_initiated", order_id=order_id, payment_id=payment.id)

        return Response(
            {
                "client_secret": intent.client_secret,
                "payment_id": payment.id,
            },
            status=status.HTTP_200_OK,
        )
    except stripe.error.StripeError as e:
        safe_err = sanitize_log_input(str(e))
        logger.error("stripe_error", order_id=order_id, error=safe_err)
        return Response(
            {"error": "Payment processing failed. Please try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='5/m', block=True)
def initiate_mpesa_payment(request):
    """
    Initiate M-Pesa STK Push for an order.
    """
    order_id = request.data.get("order_id")
    phone_number = request.data.get("phone_number")

    if not order_id or not phone_number:
        return Response(
            {"error": "order_id and phone_number are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        order = Order.objects.get(id=order_id, user=request.user, status="pending")
    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found or not pending."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Amount is always derived server-side from the order total. Never trust a
    # client-supplied amount — doing so would allow paying an arbitrary price.
    amount = order.total_amount
    if amount is None or amount <= 0:
        return Response(
            {"error": "Order has no payable amount."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Get access token
    try:
        access_token = get_mpesa_access_token()
    except Exception as e:
        safe_err = sanitize_log_input(str(e))
        logger.error("mpesa_authentication_failed", error=safe_err)
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

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=5),
        retry=retry_if_exception_type(requests.RequestException)
    )
    def _do_stk_push():
        resp = requests.post(MPESA_LIPA_URL, json=payload, headers=headers, timeout=10)
        # Force a RequestException if it's a 500 or 429, which triggers a retry
        if resp.status_code == 429 or resp.status_code >= 500:
            resp.raise_for_status()
        return resp

    try:
        response = _do_stk_push()
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

            log_activity(
                user=request.user,
                event_type='PAYMENT_INITIATED',
                ip_address=request.META.get('REMOTE_ADDR'),
                details_dict={'payment_method': 'mpesa', 'order_id': order_id, 'amount': amount, 'payment_id': payment.id}
            )

            logger.info("mpesa_payment_initiated", order_id=order_id, checkout_id=checkout_request_id)

            return Response(
                {
                    "message": "M-Pesa STK Push initiated. Check your phone for PIN prompt.",
                    "checkout_request_id": checkout_request_id,
                    "payment_id": payment.id,
                },
                status=status.HTTP_200_OK,
            )
        else:
            logger.error("mpesa_api_error", order_id=order_id, response_data=response_data)
            return Response(
                {"error": "Failed to initiate payment. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except requests.RequestException as e:
        logger.error("mpesa_request_failed", order_id=order_id, error=str(e))
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
        logger.warning("mpesa_passkey_missing")
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
        logger.error("mpesa_signature_verification_error", error=str(e))
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
            logger.warning("mpesa_callback_invalid_signature")
            return JsonResponse(
                {"ResultCode": 1, "ResultDesc": "Invalid signature"},
                status=401
            )

        callback_data = json.loads(request.body)
        logger.info("mpesa_callback_verified")

        # Real Daraja STK callback shape:
        #   Body.stkCallback = {
        #     CheckoutRequestID, ResultCode, ResultDesc,
        #     CallbackMetadata: { Item: [ {Name, Value}, ... ] }   # only on success
        #   }
        # The Payment record's `reference` is the CheckoutRequestID we stored at
        # initiation, so we match on that (not the receipt number).
        stk_callback = callback_data.get("Body", {}).get("stkCallback", {})
        checkout_request_id = stk_callback.get("CheckoutRequestID", "")
        result_code = stk_callback.get("ResultCode")

        if not checkout_request_id:
            logger.warning("mpesa_callback_missing_checkout_id")
            return JsonResponse({"ResultCode": 0, "ResultDesc": "Success"})

        try:
            payment = Payment.objects.get(
                reference=checkout_request_id, method="mpesa"
            )
        except Payment.DoesNotExist:
            logger.error(
                "payment_not_found_for_checkout", checkout_id=checkout_request_id
            )
            return JsonResponse({"ResultCode": 0, "ResultDesc": "Success"})

        if result_code == 0:  # Success
            # CallbackMetadata.Item is a list of {Name, Value} pairs.
            items = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            metadata = {
                item.get("Name"): item.get("Value")
                for item in items
                if item.get("Name")
            }
            receipt = metadata.get("MpesaReceiptNumber", "")

            payment.status = "completed"
            payment.transaction_date = timezone.now()
            if receipt:
                # Store the actual M-Pesa receipt now that we have it.
                payment.reference = receipt
            payment.save()

            order = payment.order
            order.status = "paid"
            order.save()

            logger.info(
                "mpesa_payment_completed",
                order_id=order.id,
                receipt=receipt,
                checkout_id=checkout_request_id,
            )
        else:
            payment.status = "failed"
            payment.save()
            logger.warning(
                "mpesa_transaction_failed",
                checkout_id=checkout_request_id,
                error_code=result_code,
                error_desc=stk_callback.get("ResultDesc", "Unknown error"),
            )

        return JsonResponse({"ResultCode": 0, "ResultDesc": "Success"})

    except json.JSONDecodeError:
        logger.error("mpesa_callback_invalid_json")
        return JsonResponse(
            {"ResultCode": 1, "ResultDesc": "Invalid JSON"},
            status=400
        )
    except Exception as e:
        logger.exception("mpesa_callback_error", error=str(e))
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
        logger.error("stripe_webhook_secret_missing")
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

                logger.info("stripe_payment_completed", order_id=order_id, reference=reference)

            except Payment.DoesNotExist:
                logger.error("stripe_payment_not_found", reference=reference)

        return JsonResponse({"status": "success"}, status=200)

    except stripe.error.SignatureVerificationError as e:
        logger.warning("stripe_invalid_signature", error=str(e))
        return JsonResponse({"error": "Invalid signature"}, status=401)
    except json.JSONDecodeError:
        logger.error("stripe_invalid_json")
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        logger.exception("stripe_webhook_error", error=str(e))
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
