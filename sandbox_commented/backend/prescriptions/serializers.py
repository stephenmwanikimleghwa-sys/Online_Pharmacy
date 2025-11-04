# from rest_framework import serializers
# from .models import Prescription, GenderChoices
# from django.core.exceptions import ValidationError
# from django.contrib.auth import get_user_model
# from django.core.validators import FileExtensionValidator
# from django.utils import timezone
# 
# User = get_user_model()
# 
# 
# class PrescriptionSerializer(serializers.ModelSerializer):
#     """
#     Serializer for listing and retrieving prescriptions.
#     Includes user info and status.
#     """
# 
#     user = serializers.StringRelatedField(read_only=True)
#     verified_by = serializers.StringRelatedField(read_only=True)
#     file_url = serializers.SerializerMethodField()
# 
#     class Meta:
#         model = Prescription
#         fields = (
#             "id",
#             "user",
#             "file_path",
#             "file_url",
#             "status",
#             "verified_by",
#             "notes",
#             "uploaded_at",
#             "verified_at",
#             "prescription_type",
#             "patient_name",
#             "patient_age",
#             "patient_gender",
#             "patient_contact",
#             "patient_id_number",
#             "prescribed_medicines",
#             "added_by",
#             "dispensed_at",
#             "dispensed_by",
#         )
#         read_only_fields = (
#             "id",
#             "user",
#             "uploaded_at",
#             "verified_at",
#             "added_by",
#             "dispensed_at",
#             "dispensed_by",
#         )
# 
#     def get_file_url(self, obj):
#         if obj.file_path:
#             return obj.file_path.url
#         return None
# 
# 
# class PrescriptionCreateSerializer(serializers.ModelSerializer):
#     """
#     Serializer for creating a new prescription upload.
#     Handles file upload and basic validation.
#     """
# 
#     file_path = serializers.FileField(
#         write_only=True,
#         validators=[
#             FileExtensionValidator(allowed_extensions=[".pdf", ".jpg", ".jpeg", ".png"])
#         ],
#         required=True,
#     )
# 
#     class Meta:
#         model = Prescription
#         fields = ("file_path", "notes")
# 
#     def validate_file_path(self, value):
#         if value.size > 5 * 1024 * 1024:  # 5MB max
#             raise ValidationError("File size must be under 5MB.")
#         return value
# 
#     def create(self, validated_data):
#         user = self.context["request"].user
#         file_path = validated_data.pop("file_path")
#         notes = validated_data.get("notes", "")
# 
#         prescription = Prescription.objects.create(
#             user=user,
#             file_path=file_path,
#             notes=notes,
#             status="pending",
#         )
#         return prescription
# 
# 
# class PrescriptionUpdateSerializer(serializers.ModelSerializer):
#     """
#     Serializer for updating prescription (e.g., verification notes/status).
#     Partial updates allowed.
#     """
# 
#     status = serializers.ChoiceField(
#         choices=[
#             ("pending", "Pending"),
#             ("validated", "Validated"),
#             ("rejected", "Rejected"),
#             ("dispensed", "Dispensed"),
#             ("completed", "Completed"),
#         ],
#         required=False,
#     )
# 
#     class Meta:
#         model = Prescription
#         fields = ("status", "notes")
# 
#     def validate_status(self, value):
#         if value in ["validated", "rejected", "dispensed", "completed"]:
#             if self.context["request"].user.is_authenticated and self.context[
#                 "request"
#             ].user.role not in ["admin", "pharmacist"]:
#                 raise ValidationError(
#                     "Only admins and pharmacists can update prescription status."
#                 )
#         return value
# 
#     def update(self, instance, validated_data):
#         status = validated_data.get("status")
#         notes = validated_data.get("notes", instance.notes)
# 
#         if status:
#             instance.status = status
#             if status == "validated":
#                 instance.verified_by = self.context["request"].user
#                 instance.verified_at = timezone.now()
#             elif status == "rejected":
#                 instance.verified_by = self.context["request"].user
#             elif status == "dispensed":
#                 instance.dispensed_by = self.context["request"].user
#                 instance.dispensed_at = timezone.now()
# 
#         instance.notes = notes
#         instance.save()
#         return instance
# 
# 
# class ManualPrescriptionCreateSerializer(serializers.ModelSerializer):
#     """
#     Serializer for manual prescription creation by pharmacists.
#     """
# 
#     class Meta:
#         model = Prescription
#         fields = [
#             "patient_name",
#             "patient_age",
#             "patient_gender",
#             "patient_contact",
#             "patient_id_number",
#             "prescribed_medicines",
#             "notes",
#         ]
# 
#     def validate_prescribed_medicines(self, value):
#         """Validate prescribed medicines format"""
#         if not isinstance(value, list):
#             raise serializers.ValidationError("Prescribed medicines must be a list")
# 
#         for medicine in value:
#             if not all(key in medicine for key in ["name", "dosage", "quantity"]):
#                 raise serializers.ValidationError(
#                     "Each medicine must have name, dosage, and quantity"
#                 )
#         return value
