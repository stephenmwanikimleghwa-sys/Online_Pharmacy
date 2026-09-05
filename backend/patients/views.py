from rest_framework import serializers, viewsets, permissions
from rest_framework.filters import SearchFilter
from django.db.models import Q
from datetime import date

from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    date_of_birth = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Patient
        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "date_of_birth",
            "gender",
            "phone_number",
            "email",
            "address",
            "county",
            "allergies",
            "medical_history",
            "is_active",
            "created_at",
        )
        read_only_fields = ("created_at",)
        extra_kwargs = {
            "gender": {"required": False},
            "phone_number": {"required": False, "allow_blank": True},
        }

    def get_full_name(self, obj):
        return obj.full_name()

    def validate_date_of_birth(self, value):
        if value is None:
            return date(2000, 1, 1)
        return value

    def create(self, validated_data):
        validated_data.setdefault("date_of_birth", date(2000, 1, 1))
        validated_data.setdefault("gender", "PREFER_NOT_TO_SAY")
        validated_data.setdefault("phone_number", validated_data.get("phone_number") or "0000000000")
        return super().create(validated_data)


class PatientViewSet(viewsets.ModelViewSet):
    """Search and register patients for clinical consultations."""

    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["first_name", "last_name", "phone_number", "national_id"]
    http_method_names = ["get", "post", "patch", "head", "options"]
    # Clinical search needs more than the global PAGE_SIZE=20 default.
    pagination_class = None

    def get_queryset(self):
        qs = Patient.objects.filter(is_active=True).order_by("last_name", "first_name")
        q = (self.request.query_params.get("search") or "").strip()
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(phone_number__icontains=q)
                | Q(national_id__icontains=q)
            )
        return qs
