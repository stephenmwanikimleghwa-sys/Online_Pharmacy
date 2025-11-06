from django.urls import path
from . import views

app_name = "orders"

urlpatterns = [
    # List and create orders
    path("", views.OrderListCreateView.as_view(), name="list_create"),
    # Retrieve, update, delete specific order
    path("<int:pk>/", views.OrderRetrieveUpdateDestroyView.as_view(), name="detail"),
    # User's own orders
    path("my-orders/", views.my_orders, name="my_orders"),
    # Quick sale endpoint
    path("quick/", views.quick_sale, name="quick_sale"),
]
