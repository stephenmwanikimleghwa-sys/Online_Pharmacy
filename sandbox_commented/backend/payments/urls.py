# from django.urls import path
# from . import views
# 
# app_name = "payments"
# 
# urlpatterns = [
#     # Initiate payments
#     path("mpesa/initiate/", views.initiate_mpesa_payment, name="mpesa_initiate"),
#     path("stripe/initiate/", views.initiate_stripe_payment, name="stripe_initiate"),
#     # Payment status and details
#     path("<int:pk>/status/", views.payment_status, name="payment_status"),
#     # Webhook callbacks
#     path("mpesa/callback/", views.mpesa_callback, name="mpesa_callback"),
#     path("stripe/webhook/", views.stripe_webhook, name="stripe_webhook"),
#     # List user's payments
#     path("my-payments/", views.my_payments, name="my_payments"),
# ]
