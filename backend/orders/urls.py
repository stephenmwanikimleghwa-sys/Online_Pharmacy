from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "orders"

router = DefaultRouter()
router.register(r'templates', views.OrderTemplateViewSet, basename='template')

urlpatterns = [
    # List and create orders
    path("", views.OrderListCreateView.as_view(), name="list_create"),
    # Retrieve, update, delete specific order
    path("<int:pk>/", views.OrderRetrieveUpdateDestroyView.as_view(), name="detail"),
    # User's own orders
    path("my-orders/", views.my_orders, name="my_orders"),
    # Quick sale endpoint
    path("quick/", views.quick_sale, name="quick_sale"),
    # Receipt PDF
    path("<int:pk>/receipt/", views.get_receipt_pdf, name="receipt_pdf"),
    
    path('', include(router.urls)),
]
