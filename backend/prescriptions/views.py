from rest_framework import generics, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
from .models import Prescription, PrescriptionStatusChoices
from .serializers import (
    PrescriptionCreateSerializer,
    PrescriptionSerializer,
    PrescriptionUpdateSerializer,
)
from users.permissions import IsPharmacistOrAdmin, IsOwnerOrAdmin
from users.models import User
from django.http import HttpRequest  # Added import


class PrescriptionUploadView(generics.CreateAPIView):
    """
    Upload a new prescription (authenticated users only).
    Supports file upload for prescription images/PDFs.
    """

    serializer_class = PrescriptionCreateSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PrescriptionListView(generics.ListAPIView):
    """
    List prescriptions for the authenticated user.
    """

    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = []

    def get_queryset(self):
        return Prescription.objects.filter(user=self.request.user).order_by(
            "-uploaded_at"
        )


class PrescriptionDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve and update a specific prescription.
    Only owner or admin can update.
    """

    serializer_class = PrescriptionUpdateSerializer
    permission_classes = [IsOwnerOrAdmin]
    lookup_field = "pk"

    def get_queryset(self):
        return Prescription.objects.select_related("user", "verified_by")


@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def verify_prescription(request, pk):
    """
    Verify a prescription (pharmacists/admins only).
    Updates status to verified and sets verified_by.
    """
    prescription = get_object_or_404(Prescription, pk=pk)
    status = request.data.get("status")
    notes = request.data.get("notes", "")

    if status not in [PrescriptionStatusChoices.VALIDATED, PrescriptionStatusChoices.REJECTED]:
        return Response(
            {"error": "Invalid status. Must be 'validated' or 'rejected'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    prescription.status = status
    prescription.verified_by = request.user
    prescription.verified_at = timezone.now()
    prescription.notes = notes
    prescription.save()

    serializer = PrescriptionSerializer(prescription)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def pharmacist_prescriptions(request):
    """
    List pending prescriptions for verification (pharmacists/admins).
    """
    prescriptions = Prescription.objects.filter(
        status=PrescriptionStatusChoices.PENDING
    ).select_related("user")
    serializer = PrescriptionSerializer(prescriptions, many=True)
    return Response(serializer.data)


class AdminPrescriptionListView(generics.ListAPIView):
    """
    List all prescriptions for admin review.
    """

    serializer_class = PrescriptionSerializer
    permission_classes = [IsPharmacistOrAdmin]  # Admins can see all

    def get_queryset(self):
        return Prescription.objects.select_related("user", "verified_by").order_by(
            "-uploaded_at"
        )


@api_view(["GET"])
@permission_classes([IsPharmacistOrAdmin])
def pharmacist_dispensed_prescriptions(request):
    """
    List dispensed prescriptions for pharmacists/admins.
    """
    prescriptions = Prescription.objects.filter(
        status=PrescriptionStatusChoices.DISPENSED
    ).select_related("user")
    serializer = PrescriptionSerializer(prescriptions, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def dispense_prescription(request, pk):
    """
    Dispense a prescription (mark as filled).
    """
    prescription = get_object_or_404(Prescription, pk=pk)
    if prescription.status != "verified":
        return Response(
            {"error": "Prescription must be verified before dispensing."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    prescription.fill_status = "filled"
    prescription.dispensed_at = timezone.now()
    prescription.save()

    serializer = PrescriptionSerializer(prescription)
    return Response(serializer.data)


class ManualPrescriptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for manual prescription creation by pharmacists"""

    class Meta:
        model = Prescription
        fields = [
            "patient_name",
            "patient_age",
            "patient_gender",
            "patient_contact",
            "patient_id_number",
            "prescribed_medicines",
            "notes",
        ]

    def validate_prescribed_medicines(self, value):
        """Validate prescribed medicines format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Prescribed medicines must be a list")

        for medicine in value:
            if not all(key in medicine for key in ["name", "dosage", "quantity"]):
                raise serializers.ValidationError(
                    "Each medicine must have name, dosage, and quantity"
                )
        return value


class ManualPrescriptionCreateView(generics.CreateAPIView):
    """
    Create a manual prescription entry (pharmacists/admins only).
    """

    serializer_class = ManualPrescriptionCreateSerializer
    permission_classes = [IsPharmacistOrAdmin]

    def perform_create(self, serializer):
        serializer.save(
            prescription_type="manual", status="pending", added_by=self.request.user
        )


@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def dispense_prescription_medicines(request: HttpRequest, pk: int):
    """
    Dispense medicines from a prescription and update inventory.
    """
    prescription = get_object_or_404(Prescription, pk=pk)

    if prescription.status != "verified":
        return Response(
            {"error": "Prescription must be verified before dispensing"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Move diagnostics-related reports to separate views
    @api_view(["GET"])
    @permission_classes([IsAdminUser])
    def daily_prescriptions_report(request: HttpRequest):
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        if not start_date_str or not end_date_str:
            return Response(
                {"error": "Start and end dates are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = timezone.datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = timezone.datetime.strptime(end_date_str, "%Y-%m-%d")
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prescriptions = Prescription.objects.filter(
            uploaded_at__range=[start_date, end_date + timedelta(days=1)]
        ).select_related("user")
        daily_reports = []
        for date in (
            start_date + timedelta(days=x)
            for x in range((end_date - start_date).days + 1)
        ):
            count = prescriptions.filter(uploaded_at__date=date).aggregate(
                validated=Count("id"),
                rejected=Count("id", filter=Q(status="rejected")),
                dispensed=Count("id", filter=Q(status="dispensed")),
            )
            daily_reports.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "validated": count["validated"],
                    "rejected": count["rejected"],
                    "dispensed": count["dispensed"],
                }
            )
        return Response({"daily_prescriptions": daily_reports})

    @api_view(["GET"])
    @permission_classes([IsAdminUser])
    def medicines_dispensed_report(request: HttpRequest):
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        if not start_date_str or not end_date_str:
            return Response(
                {"error": "Start and end dates are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = timezone.datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = timezone.datetime.strptime(end_date_str, "%Y-%m-%d")
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prescriptions = Prescription.objects.filter(
            uploaded_at__range=[start_date, end_date + timedelta(days=1)],
            status="dispensed",
        )
        medicine_data = {}
        for prescription in prescriptions:
            for medicine in prescription.prescribed_medicines:
                name = medicine["name"]
                quantity = medicine["quantity"]
                medicine_data[name] = medicine_data.get(name, 0) + quantity
        medicines_list = [
            {"name": name, "quantity": qty} for name, qty in medicine_data.items()
        ]
        return Response({"medicines_dispensed": medicines_list})

    @api_view(["GET"])
    @permission_classes([IsAdminUser])
    def stock_usage_report(request: HttpRequest):
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        if not start_date_str or not end_date_str:
            return Response(
                {"error": "Start and end dates are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = timezone.datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = timezone.datetime.strptime(end_date_str, "%Y-%m-%d")
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prescriptions = Prescription.objects.filter(
            uploaded_at__range=[start_date, end_date + timedelta(days=1)],
            status="dispensed",
        )
        medicine_usage = {}
        for prescription in prescriptions:
            for medicine in prescription.prescribed_medicines:
                name = medicine["name"]
                quantity = medicine["quantity"]
                if name in medicine_usage:
                    medicine_usage[name]["dispensed"] += quantity
                    medicine_usage[name]["total_dispensed"] += quantity
                else:
                    medicine_usage[name] = {
                        "dispensed": quantity,
                        "total_dispensed": quantity,
                    }
        usage_list = [
            {
                "product": name,
                "dispensed_today": data["dispensed"],
                "total_dispensed": data["total_dispensed"],
            }
            for name, data in medicine_usage.items()
        ]
        return Response({"stock_usage": usage_list})

    # Update prescription status
    prescription.status = "dispensed"
    prescription.dispensed_by = request.user
    prescription.dispensed_at = timezone.now()
    prescription.save()

    serializer = PrescriptionSerializer(prescription)
    return Response(serializer.data)


# ```
