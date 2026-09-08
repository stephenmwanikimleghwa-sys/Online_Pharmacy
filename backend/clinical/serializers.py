from rest_framework import serializers
from .models import Consultation, LabTest


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = '__all__'
        read_only_fields = ['created_at']


class ConsultationSerializer(serializers.ModelSerializer):
    lab_tests = LabTestSerializer(many=True, read_only=True)
    # Patient.full_name / User.get_full_name are methods — CharField(source=...)
    # would serialize the bound method and break the clinical list/detail APIs.
    patient_name = serializers.SerializerMethodField()
    practitioner_name = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'is_paid']

    def get_patient_name(self, obj):
        if not obj.patient_id:
            return ''
        return obj.patient.full_name()

    def get_practitioner_name(self, obj):
        if not obj.practitioner_id:
            return ''
        name = obj.practitioner.get_full_name()
        return name or obj.practitioner.username or ''
