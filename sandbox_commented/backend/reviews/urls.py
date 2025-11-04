# from django.urls import path
# from . import views
# 
# app_name = "reviews"
# 
# urlpatterns = [
#     # List reviews for a product or all
#     path("", views.ReviewListCreateView.as_view(), name="list"),
#     path(
#         "product/<int:product_id>/",
#         views.ReviewListCreateView.as_view(),
#         name="product_reviews",
#     ),
#     # Create a review (authenticated users only)
#     path("create/", views.ReviewListCreateView.as_view(), name="create"),
#     # Detail view for a specific review
#     path("<int:pk>/", views.ReviewRetrieveUpdateDestroyView.as_view(), name="detail"),
#     # Update a review (owner or admin only)
#     path(
#         "<int:pk>/update/",
#         views.ReviewRetrieveUpdateDestroyView.as_view(),
#         name="update",
#     ),
#     # Delete a review (owner or admin only)
#     path(
#         "<int:pk>/delete/",
#         views.ReviewRetrieveUpdateDestroyView.as_view(),
#         name="delete",
#     ),
#     # Summary for a product (average rating, total)
#     path(
#         "product/<int:product_id>/summary/",
#         views.product_review_summary,
#         name="summary",
#     ),
# ]
