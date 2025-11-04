# from django.urls import path, include
# from rest_framework.routers import DefaultRouter
# from . import views
# 
# app_name = "products"
# 
# # Create a router and register our viewset
# router = DefaultRouter()
# router.register(r'', views.ProductViewSet, basename='product')
# 
# urlpatterns = [
#     # ViewSet URLs (includes list, create, retrieve, update, delete)
#     path('', include(router.urls)),
#     
#     # Keep existing function-based views
#     path("search/", views.search_products, name="search"),
#     path("my-products/", views.my_products, name="my_products"),
# ]
