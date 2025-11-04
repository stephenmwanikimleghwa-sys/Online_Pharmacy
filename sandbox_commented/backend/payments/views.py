# from rest_framework import status
# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.response import Response
# from rest_framework.permissions import IsAuthenticated
# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# from django.conf import settings
# import stripe
# import requests
# import json
# from datetime import datetime
# from .models import Payment
# from orders.models import Order
# from .serializers import PaymentSerializer
# from django.shortcuts import get_object_or_404
# from django.utils import timezone
# from django.core.cache import cache
# import base64
# 
# # Set Stripe key from settings
# stripe.api_key = settings.STRIPE_SECRET_KEY
# 
# # M-Pesa configuration from settings
# MPESA_CONSUMER_KEY = settings.MPESA_CONSUMER_KEY
# MPESA_CONSUMER_SECRET = settings.MPESA_CONSUMER_SECRET
# MPESA_SHORTCODE = settings.MPESA_SHORTCODE
# MPESA_PASSKEY = settings.MPESA_PASSKEY
# MPESA_CALLBACK_URL = settings.MPESA_CALLBACK_URL
# MPESA_OAUTH_URL = (
#     "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
# )
# MPESA_LIPA_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
# 
# 
# def get_mpesa_access_token():
#     """
#     Get M-Pesa OAuth access token (cached for 1 hour).
#     """
#     cache_key = "mpesa_access_token"
#     token = cache.get(cache_key)
#     if token:
#         return token
# 
#     # Base64 encode consumer key and secret
#     credentials = base64.b64encode(
#         f"{MPESA_CONSUMER_KEY}:{MPESA_CONSUMER_SECRET}".encode()
#     ).decode()
# 
#     headers = {
#         "Authorization": f"Basic {credentials}",
#         "Content-Type": "application/json",
#     }
# 
#     response = requests.get(MPESA_OAUTH_URL, headers=headers)
#     if response.status_code == 200:
#         data = response.json()
#         token = data["access_token"]
#         cache.set(cache_key, token, 3600)  # Cache for 1 hour
#         return token
#     else:
#         raise Exception(f"Failed to get M-Pesa token: {response.text}")
# 
# 
# @api_view(["POST"])
# @permission_classes([IsAuthenticated])
# def initiate_stripe_payment(request):
#     """
#     Initiate a Stripe payment for an order.
#     """
#     order_id = request.data.get("order_id")
#     amount = request.data.get("amount")
# 
#     if not order_id or not amount:
#         return Response(
#             {"error": "order_id and amount are required."},
#             status=status.HTTP_400_BAD_REQUEST,
#         )
# 
#     try:
#         order = Order.objects.get(id=order_id, user=request.user, status="pending")
#     except Order.DoesNotExist:
#         return Response(
#             {"error": "Order not found or not pending."},
#             status=status.HTTP_404_NOT_FOUND,
#         )
# 
#     # Create Stripe PaymentIntent
#     try:
#         intent = stripe.PaymentIntent.create(
#             amount=int(amount * 100),  # Stripe uses cents
#             currency="kes",
#             metadata={"order_id": str(order_id)},
#         )
# 
#         # Create Payment record
#         payment = Payment.objects.create(
#             order=order,
#             method="stripe",
#             amount=amount,
#             status="initiated",
#             reference=intent.id,
#         )
#         payment.save()
# 
#         return Response(
#             {
#                 "client_secret": intent.client_secret,
#                 "payment_id": payment.id,
#             },
#             status=status.HTTP_200_OK,
#         )
#     except stripe.error.StripeError as e:
#         return Response(
#             {"error": f"Stripe error: {str(e)}"},
#             status=status.HTTP_400_BAD_REQUEST,
#         )
# 
# 
# @api_view(["POST"])
# @permission_classes([IsAuthenticated])
# def initiate_mpesa_payment(request):
#     """
#     Initiate M-Pesa STK Push for an order.
#     """
#     order_id = request.data.get("order_id")
#     amount = request.data.get("amount")
#     phone_number = request.data.get("phone_number")
# 
#     if not order_id or not amount or not phone_number:
#         return Response(
#             {"error": "order_id, amount, and phone_number are required."},
#             status=status.HTTP_400_BAD_REQUEST,
#         )
# 
#     try:
#         order = Order.objects.get(id=order_id, user=request.user, status="pending")
#     except Order.DoesNotExist:
#         return Response(
#             {"error": "Order not found or not pending."},
#             status=status.HTTP_404_NOT_FOUND,
#         )
# 
#     # Get access token
#     try:
#         access_token = get_mpesa_access_token()
#     except Exception as e:
#         return Response(
#             {"error": f"M-Pesa authentication failed: {str(e)}"},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#         )
# 
#     # Prepare STK Push payload
#     timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
#     password = base64.b64encode(
#         f"{MPESA_SHORTCODE}{MPESA_PASSKEY}{timestamp}".encode()
#     ).decode()
# 
#     payload = {
#         "BusinessShortCode": MPESA_SHORTCODE,
#         "Password": password,
#         "Timestamp": timestamp,
#         "TransactionType": "CustomerPayBillOnline",
#         "Amount": str(int(amount)),
#         "PartyA": phone_number.replace("+", ""),
#         "PartyB": MPESA_SHORTCODE,
#         "PhoneNumber": phone_number.replace("+", ""),
#         "CallBackURL": MPESA_CALLBACK_URL,
#         "AccountReference": f"Order {order_id}",
#         "TransactionDesc": "Payment for pharmacy order",
#     }
# 
#     headers = {
#         "Authorization": f"Bearer {access_token}",
#         "Content-Type": "application/json",
#     }
# 
#     response = requests.post(MPESA_LIPA_URL, json=payload, headers=headers)
#     response_data = response.json()
# 
#     if response.status_code == 200:
#         checkout_request_id = response_data.get("CheckoutRequestID")
#         # Create Payment record
#         payment = Payment.objects.create(
#             order=order,
#             method="mpesa",
#             amount=amount,
#             status="initiated",
#             reference=checkout_request_id,
#         )
#         payment.save()
# 
#         return Response(
#             {
#                 "message": "M-Pesa STK Push initiated. Check your phone for PIN prompt.",
#                 "checkout_request_id": checkout_request_id,
#                 "payment_id": payment.id,
#             },
#             status=status.HTTP_200_OK,
#         )
#     else:
#         return Response(
#             {"error": "Failed to initiate M-Pesa payment.", "response": response_data},
#             status=status.HTTP_400_BAD_REQUEST,
#         )
# 
# 
# @csrf_exempt
# def mpesa_callback(request):
#     """
#     Handle M-Pesa callback (asynchronous validation).
#     """
#     try:
#         callback_data = json.loads(request.body)
#         print(f"M-Pesa Callback: {callback_data}")
# 
#         # Process each transaction
#         for result in callback_data["Body"]["stkCallback"]["Result"] or []:
#             if result["ResultCode"] == 0:  # Success
#                 receipt = result["MpesaReceiptNumber"]
#                 amount = result["Amount"]
#                 phone = result["PhoneNumber"]
#                 order_id = result["AccountReference"].replace("Order ", "")
# 
#                 try:
#                     payment = Payment.objects.get(reference=receipt, method="mpesa")
#                     payment.status = "completed"
#                     payment.transaction_date = timezone.now()
#                     payment.save()
# 
#                     order = payment.order
#                     order.status = "paid"
#                     order.save()
# 
#                     # Trigger fulfillment (e.g., email)
#                     # send_order_confirmation(order)
# 
#                 except Payment.DoesNotExist:
#                     print(f"Payment not found for receipt {receipt}")
# 
#             else:
#                 # Handle failure
#                 print(f"M-Pesa failure: {result}")
# 
#         return JsonResponse({"ResultCode": 1, "ResultDesc": "Accepted"})
#     except Exception as e:
#         print(f"M-Pesa callback error: {str(e)}")
#         return JsonResponse(
#             {"ResultCode": 1, "ResultDesc": "Accepted"}
#         )  # Acknowledge anyway
# 
# 
# @csrf_exempt
# def stripe_webhook(request):
#     """
#     Handle Stripe webhook for payment confirmation.
#     """
#     payload = request.body
#     sig_header = request.META["HTTP_STRIPE_SIGNATURE"]
#     endpoint_secret = settings.STRIPE_WEBHOOK_SECRET  # Add to .env for production
# 
#     try:
#         event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
# 
#         if event["type"] == "payment_intent.succeeded":
#             payment_intent = event["data"]["object"]
#             reference = payment_intent["id"]
#             order_id = payment_intent["metadata"]["order_id"]
# 
#             try:
#                 payment = Payment.objects.get(reference=reference, method="stripe")
#                 payment.status = "completed"
#                 payment.transaction_date = timezone.now()
#                 payment.save()
# 
#                 order = payment.order
#                 order.status = "paid"
#                 order.save()
# 
#                 # Trigger fulfillment (e.g., email, Celery task)
#                 # send_order_confirmation(order)
# 
#             except Payment.DoesNotExist:
#                 print(f"Payment not found for Stripe ID {reference}")
# 
#         return JsonResponse({"status": "success"}, status=200)
#     except stripe.error.SignatureVerificationError as e:
#         return JsonResponse({"error": "Invalid Stripe signature"}, status=400)
#     except Exception as e:
#         print(f"Stripe webhook error: {str(e)}")
#         return JsonResponse({"error": "Failed to process webhook"}, status=400)
# 
# 
# @api_view(["GET"])
# @permission_classes([IsAuthenticated])
# def payment_status(request, pk):
#     """
#     Retrieve payment status for a specific payment by ID.
#     Only the order owner can access.
#     """
#     payment = get_object_or_404(Payment, id=pk, order__user=request.user)
#     serializer = PaymentSerializer(payment)
#     return Response(serializer.data)
# 
# 
# @api_view(["GET"])
# @permission_classes([IsAuthenticated])
# def my_payments(request):
#     """
#     List payments for the authenticated user.
#     """
#     payments = Payment.objects.filter(order__user=request.user).order_by("-created_at")
#     serializer = PaymentSerializer(payments, many=True)
#     return Response(serializer.data)
