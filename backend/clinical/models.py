from django.db import models
from django.conf import settings
from patients.models import Patient
from django.utils import timezone

class Consultation(models.Model):
    STATUS_CHOICES = [
        ('waiting', 'Waiting for Triage'),
        ('triage', 'In Triage'),
        ('consultation', 'In Consultation'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='consultations')
    practitioner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='conducted_consultations',
        limit_choices_to={'role__in': ['pharmacist', 'admin']}
    )
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.PROTECT,
        related_name='consultations',
        null=True, blank=True
    )
    
    # Triage Vitals
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text="In Celsius")
    blood_pressure_systolic = models.PositiveIntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.PositiveIntegerField(null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, help_text="In kg")
    spo2 = models.PositiveIntegerField(null=True, blank=True, help_text="Blood oxygen percentage")
    triage_notes = models.TextField(blank=True)
    
    # Clinical Notes
    symptoms = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    
    # Billing
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_paid = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "clinical_consultations"
        ordering = ['-created_at']

    def __str__(self):
        return f"Consultation for {self.patient.full_name()} on {self.created_at.date()}"


class LabTest(models.Model):
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='lab_tests')
    test_name = models.CharField(max_length=100)
    result = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_paid = models.BooleanField(default=False)
    
    performed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "clinical_lab_tests"

    def __str__(self):
        return f"{self.test_name} for {self.consultation.patient.full_name()}"
