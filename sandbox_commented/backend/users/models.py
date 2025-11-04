# from django.contrib.auth.models import AbstractUser
# from django.db import models
# 
# 
# class RoleChoices(models.TextChoices):
#     CUSTOMER = "customer", "Customer"
#     PHARMACIST = "pharmacist", "Pharmacist"
#     ADMIN = "admin", "Admin"
# 
# 
# class User(AbstractUser):
#     role = models.CharField(
#         max_length=20, choices=RoleChoices.choices, default=RoleChoices.CUSTOMER
#     )
#     phone_number = models.CharField(max_length=15, blank=True, null=True)
#     profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)
#     date_of_birth = models.DateField(blank=True, null=True)
#     address = models.TextField(blank=True, null=True)
#     is_verified = models.BooleanField(default=False)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)
# 
#     class Meta:
#         db_table = "users"
#         verbose_name = "User"
#         verbose_name_plural = "Users"
# 
#     def __str__(self):
#         return f"{self.username} ({self.get_role_display()})"
# 
#     @property
#     def full_name(self):
#         return f"{self.first_name} {self.last_name}".strip()
# 
#     def save(self, *args, **kwargs):
#         # Ensure email is lowercase for consistency
#         if self.email:
#             self.email = self.email.lower()
#         super().save(*args, **kwargs)
