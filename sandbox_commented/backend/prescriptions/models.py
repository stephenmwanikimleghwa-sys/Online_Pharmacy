# from django.db import models
# from django.contrib.auth import get_user_model
# from django.core.validators import FileExtensionValidator
# from django.utils import timezone
# import json
# 
# User = get_user_model()
# 
# 
# class GenderChoices(models.TextChoices):
#     MALE = "male", "Male"
#     FEMALE = "female", "Female"
#     OTHER = "other", "Other"
# 
# 
# class PrescriptionStatusChoices(models.TextChoices):
#     PENDING = "pending", "Pending"
#     VALIDATED = "validated", "Validated"
#     REJECTED = "rejected", "Rejected"
#     DISPENSED = "dispensed", "Dispensed"
#     COMPLETED = "completed", "Completed"
# 
# 
# class PrescriptionTypeChoices(models.TextChoices):
#     UPLOADED = "uploaded", "Uploaded"
#     MANUAL = "manual", "Manual Entry"
# 
# 
# class Prescription(models.Model):
#     """
#     Model for prescriptions in Transcounty Pharmacy.
#     Supports both uploaded prescriptions from users and manual entries by pharmacists.
#     Includes patient details, prescribed medicines, validation, and dispensing tracking.
#     """
# 
#     user = models.ForeignKey(
#         User,
#         on_delete=models.CASCADE,
#         related_name="prescriptions",
#         verbose_name="User",
#         null=True,
#         blank=True,
#     )
#     file_path = models.FileField(
#         upload_to="prescriptions/",
#         validators=[
#             FileExtensionValidator(allowed_extensions=[".pdf", ".jpg", ".jpeg", ".png"])
#         ],
#         verbose_name="Prescription File",
#         null=True,
#         blank=True,
#     )
#     prescription_type = models.CharField(
#         max_length=20,
#         choices=PrescriptionTypeChoices.choices,
#         default=PrescriptionTypeChoices.UPLOADED,
#         verbose_name="Prescription Type",
#     )
#     status = models.CharField(
#         max_length=20,
#         choices=PrescriptionStatusChoices.choices,
#         default=PrescriptionStatusChoices.PENDING,
#         verbose_name="Status",
#     )
#     verified_by = models.ForeignKey(
#         User,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name="verified_prescriptions",
#         verbose_name="Verified By",
#         limit_choices_to={"role__in": ["pharmacist", "admin"]},
#     )
#     uploaded_at = models.DateTimeField(
#         auto_now_add=True,
#         verbose_name="Uploaded At",
#     )
#     verified_at = models.DateTimeField(
#         null=True,
#         blank=True,
#         verbose_name="Verified At",
#     )
#     notes = models.TextField(
#         blank=True,
#         null=True,
#         verbose_name="Notes",
#     )
# 
#     # Patient details for manual prescriptions
#     patient_name = models.CharField(
#         max_length=255,
#         blank=True,
#         null=True,
#         verbose_name="Patient Name",
#     )
#     patient_age = models.PositiveIntegerField(
#         blank=True,
#         null=True,
#         verbose_name="Patient Age",
#     )
#     patient_gender = models.CharField(
#         max_length=10,
#         choices=GenderChoices.choices,
#         blank=True,
#         null=True,
#         verbose_name="Patient Gender",
#     )
#     patient_contact = models.CharField(
#         max_length=15,
#         blank=True,
#         null=True,
#         verbose_name="Patient Contact",
#     )
#     patient_id_number = models.CharField(
#         max_length=50,
#         blank=True,
#         null=True,
#         verbose_name="Patient ID Number",
#     )
# 
#     # Prescribed medicines (stored as JSON)
#     prescribed_medicines = models.JSONField(
#         default=list,
#         verbose_name="Prescribed Medicines",
#         help_text="List of medicines with dosage, quantity, and instructions",
#     )
# 
#     # Pharmacist who added the prescription (for manual entries)
#     added_by = models.ForeignKey(
#         User,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name="added_prescriptions",
#         verbose_name="Added By",
#         limit_choices_to={"role__in": ["pharmacist", "admin"]},
#     )
# 
#     # Dispensing information
#     dispensed_at = models.DateTimeField(
#         null=True,
#         blank=True,
#         verbose_name="Dispensed At",
#     )
#     dispensed_by = models.ForeignKey(
#         User,
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True,
#         related_name="dispensed_prescriptions",
#         verbose_name="Dispensed By",
#         limit_choices_to={"role__in": ["pharmacist", "admin"]},
#     )
# 
#     class Meta:
#         db_table = "prescriptions"
#         verbose_name = "Prescription"
#         verbose_name_plural = "Prescriptions"
#         ordering = ["-uploaded_at"]
#         indexes = [
#             models.Index(fields=["user", "status"]),
#             models.Index(fields=["status"]),
#             models.Index(fields=["dispensed_at"]),
#             models.Index(fields=["verified_by"]),
#             models.Index(fields=["uploaded_at"]),
#             models.Index(fields=["added_by"]),
#             models.Index(fields=["patient_name"]),
#         ]
# 
#     def __str__(self):
#         patient_name = self.patient_name or (
#             self.user.username if self.user else "Unknown Patient"
#         )
#         return f"Prescription for {patient_name} - {self.status}"
# 
#     def save(self, *args, **kwargs):
#         if self.status == "validated" and not self.verified_at:
#             self.verified_at = timezone.now()
#         if self.status == "dispensed" and not self.dispensed_at:
#             self.dispensed_at = timezone.now()
#         super().save(*args, **kwargs)
# 
#     def get_patient_info(self):
#         """Return patient information based on prescription type"""
#         if self.prescription_type == "manual":
#             return {
#                 "name": self.patient_name,
#                 "age": self.patient_age,
#                 "gender": self.patient_gender,
#                 "contact": self.patient_contact,
#                 "id_number": self.patient_id_number,
#             }
#         else:
#             return {
#                 "name": self.user.full_name if self.user else None,
#                 "contact": self.user.phone_number if self.user else None,
#             }
# 
#     @property
#     def is_ready_for_order(self):
#         return self.status == PrescriptionStatusChoices.VALIDATED
# 
#     @property
#     def is_dispensed(self):
#         return self.status == PrescriptionStatusChoices.DISPENSED
# 
#     def add_medicine(self, medicine_name, dosage, quantity, instructions=""):
#         """Helper method to add a medicine to the prescription"""
#         medicine = {
#             "name": medicine_name,
#             "dosage": dosage,
#             "quantity": quantity,
#             "instructions": instructions,
#         }
#         self.prescribed_medicines.append(medicine)
#         self.save()
# 
#     def get_medicines_list(self):
#         """Return formatted list of prescribed medicines"""
#         return [
#             f"{med['name']} - {med['dosage']} (Qty: {med['quantity']})"
#             for med in self.prescribed_medicines
#         ]
# 
#     @property
#     def is_filled(self):
#         return self.fill_status in [
#             FillStatusChoices.FILLED,
#             FillStatusChoices.PARTIALLY_FILLED,
#         ]
