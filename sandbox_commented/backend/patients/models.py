# from django.db import models
# from django.contrib.auth import get_user_model
# from django.utils import timezone
# 
# User = get_user_model()
# 
# 
# class Patient(models.Model):
#     """
#     Model for managing patient records.
#     Includes demographics, contact info, allergies, and medical history.
#     Optionally linked to a User account for authentication.
#     """
# 
#     # Demographics
#     user = models.OneToOneField(
#         User, on_delete=models.CASCADE, null=True, blank=True, related_name="patient"
#     )
#     first_name = models.CharField(max_length=50)
#     last_name = models.CharField(max_length=50)
#     date_of_birth = models.DateField()
#     gender = models.CharField(
#         max_length=20,
#         choices=[
#             ("MALE", "Male"),
#             ("FEMALE", "Female"),
#             ("OTHER", "Other"),
#             ("PREFER_NOT_TO_SAY", "Prefer not to say"),
#         ],
#     )
#     national_id = models.CharField(
#         max_length=20, unique=True, blank=True, null=True
#     )  # Kenyan ID or passport
# 
#     # Contact Information
#     phone_number = models.CharField(max_length=15)
#     email = models.EmailField(blank=True, null=True)
#     address = models.TextField(blank=True)
#     county = models.CharField(max_length=50, blank=True)  # For Kenyan context
# 
#     # Medical Information
#     allergies = models.TextField(
#         blank=True,
#         help_text="List of allergies separated by commas (e.g., Penicillin, Nuts)",
#     )
#     medical_history = models.TextField(
#         blank=True, help_text="Summary of relevant medical history"
#     )
#     emergency_contact_name = models.CharField(max_length=100, blank=True)
#     emergency_contact_phone = models.CharField(max_length=15, blank=True)
# 
#     # Status and Timestamps
#     is_active = models.BooleanField(default=True)
#     created_at = models.DateTimeField(default=timezone.now)
#     updated_at = models.DateTimeField(auto_now=True)
# 
#     class Meta:
#         ordering = ["last_name", "first_name"]
#         verbose_name = "Patient"
#         verbose_name_plural = "Patients"
# 
#     def __str__(self):
#         return f"{self.first_name} {self.last_name} (ID: {self.id})"
# 
#     def full_name(self):
#         return f"{self.first_name} {self.last_name}"
# 
#     def age(self):
#         from datetime import date
# 
#         today = date.today()
#         return (
#             today.year
#             - self.date_of_birth.year
#             - (
#                 (today.month, today.day)
#                 < (self.date_of_birth.month, self.date_of_birth.day)
#             )
#         )
