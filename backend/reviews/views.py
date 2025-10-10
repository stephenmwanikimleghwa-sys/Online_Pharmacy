from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Avg
from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer
from products.models import Product
from users.permissions import IsOwnerOrAdmin


class ReviewListCreateView(generics.ListCreateAPIView):
    """
    List reviews for a product and create new reviews (authenticated users only).
    """

    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ReviewCreateSerializer
        return ReviewSerializer

    def get_queryset(self):
        product_id = self.kwargs.get("product_id")
        if product_id:
            return (
                Review.objects.filter(product_id=product_id, is_active=True)
                .select_related("user", "product")
                .order_by("-created_at")
            )
        return Review.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        product_id = self.kwargs.get("product_id")
        if product_id:
            product = get_object_or_404(Product, id=product_id)
            serializer.save(user=self.request.user, product=product)
        else:
            serializer.save(user=self.request.user)


class ReviewRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific review.
    Only the owner or admin can update/delete.
    """

    serializer_class = ReviewSerializer
    permission_classes = [IsOwnerOrAdmin]
    lookup_field = "pk"

    def get_queryset(self):
        return Review.objects.select_related("user", "product")


@api_view(["GET"])
@permission_classes([AllowAny])
def product_review_summary(request, product_id):
    """
    Get summary for a product's reviews (average rating, total count).
    """
    product = get_object_or_404(Product, id=product_id)
    reviews = Review.objects.filter(product=product, is_active=True)
    average_rating = reviews.aggregate(Avg("rating"))["rating__avg"] or 0
    total_reviews = reviews.count()

    serializer = ReviewSerializer(reviews, many=True)
    return Response(
        {
            "average_rating": round(average_rating, 1),
            "total_reviews": total_reviews,
            "reviews": serializer.data,
        }
    )


@api_view(["POST"])
@permission_classes([IsOwnerOrAdmin])
def delete_review(request, pk):
    """
    Delete a specific review (admin or review owner).
    """
    review = get_object_or_404(Review, pk=pk)
    review.delete()
    return Response(
        {"message": "Review deleted successfully."}, status=status.HTTP_204_NO_CONTENT
    )
