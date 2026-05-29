from rest_framework import serializers
from .models import Consultation, LabTest
from patients.models import Patient

class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = '__all__'
        read_only_fields = ['created_at']

class ConsultationSerializer(serializers.ModelSerializer):
    lab_tests = LabTestSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    practitioner_name = serializers.CharField(source='practitioner.get_full_name', read_only=True)
    
    class Meta:
        model = Consultation
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'is_paid']
