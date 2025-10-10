from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product

User = get_user_model()


class Review(models.Model):
    """
    Model for user reviews of products.
    Users can rate and comment on products they've purchased.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="Reviewer",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="Product",
    )
    rating = models.PositiveSmallIntegerField(
        choices=[(i, str(i)) for i in range(1, 6)],
        verbose_name="Rating",
    )
    comment = models.TextField(
        blank=True,
        null=True,
        verbose_name="Comment",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Is Active",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created At",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated At",
    )

    class Meta:
        db_table = "reviews"
        verbose_name = "Review"
        verbose_name_plural = "Reviews"
        unique_together = ["user", "product"]  # One review per user per product
        indexes = [
            models.Index(fields=["product", "created_at"]),
            models.Index(fields=["rating"]),
            models.Index(fields=["is_active"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.product.name} ({self.rating}/5)"

    def save(self, *args, **kwargs):
        # Ensure only one active review per user-product
        if self.is_active:
            Review.objects.filter(
                user=self.user, product=self.product, is_active=True
            ).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
