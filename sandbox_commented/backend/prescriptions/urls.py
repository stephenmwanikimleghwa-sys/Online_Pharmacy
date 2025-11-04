# from django.urls import path
# from . import views
# 
# app_name = "prescriptions"
# 
# urlpatterns = [
#     # List user's prescriptions
#     path("", views.PrescriptionListView.as_view(), name="list"),
#     # Upload new prescription
#     path("upload/", views.PrescriptionUploadView.as_view(), name="upload"),
#     # Manual prescription addition by pharmacist
#     path("add/", views.ManualPrescriptionCreateView.as_view(), name="manual_add"),
#     # Detail view for a specific prescription
#     path("<int:pk>/", views.PrescriptionDetailView.as_view(), name="detail"),
#     # Update prescription (e.g., add notes)
#     path("<int:pk>/update/", views.PrescriptionDetailView.as_view(), name="update"),
#     # Admin/Pharmacist: Verify prescription
#     path("<int:pk>/verify/", views.verify_prescription, name="verify"),
#     # Pharmacist: List pending prescriptions
#     path(
#         "pharmacist/pending/", views.pharmacist_prescriptions, name="pharmacist_pending"
#     ),
#     # Pharmacist: List dispensed prescriptions
#     path(
#         "pharmacist/dispensed/",
#         views.pharmacist_dispensed_prescriptions,
#         name="pharmacist_dispensed",
#     ),
#     # Pharmacist: Dispense prescription
#     path("<int:pk>/dispense/", views.dispense_prescription, name="dispense"),
#     # Pharmacist: Dispense prescription medicines (with inventory update)
#     path(
#         "<int:pk>/dispense-medicines/",
#         views.dispense_prescription_medicines,
#         name="dispense_medicines",
#     ),
#     # Admin: List all prescriptions for review
#     path("admin/list/", views.AdminPrescriptionListView.as_view(), name="admin_list"),
# ]
