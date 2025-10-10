from django.urls import path
from . import views

app_name = "products"

urlpatterns = [
    # List and create products
    path("", views.ProductListCreateView.as_view(), name="list_create"),
    # Retrieve, update, delete specific product
    path("<int:pk>/", views.ProductRetrieveUpdateDestroyView.as_view(), name="detail"),
    # Search products
    path("search/", views.search_products, name="search"),
    # Pharmacist's own products
    path("my-products/", views.my_products, name="my_products"),
    # Featured products (for home page)
    path("featured/", views.FeaturedProductsView.as_view(), name="featured"),
]
