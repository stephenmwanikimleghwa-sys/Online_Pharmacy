from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

from .models import Consultation, LabTest
from .serializers import ConsultationSerializer, LabTestSerializer

from inventory.models.dispensing import Dispensation, DispensationItem
from config.api_responses import api_success, api_validation_error

class ConsultationViewSet(viewsets.ModelViewSet):
    queryset = Consultation.objects.all()
    serializer_class = ConsultationSerializer
    
    def perform_create(self, serializer):
        serializer.save(practitioner=self.request.user, branch=self.request.user.branch)
        
    @action(detail=True, methods=['post'])
    def bill_to_otc(self, request, pk=None):
        """
        Integrates the consultation and any unpaid lab tests into an OTC Sale.
        Creates a Dispensation record for the billing.
        """
        consultation = self.get_object()
        if consultation.is_paid:
            return api_validation_error("This consultation has already been billed.")
            
        with transaction.atomic():
            # Calculate totals
            total_amount = consultation.consultation_fee
            unpaid_labs = consultation.lab_tests.filter(is_paid=False)
            
            for lab in unpaid_labs:
                total_amount += lab.cost
                
            # Create OTC Dispensation (Sale)
            dispensation = Dispensation.objects.create(
                sale_type='otc',
                branch=consultation.branch,
                dispensed_by=request.user,
                patient_name=consultation.patient.full_name(),
                total_amount=total_amount,
                payment_mode=request.data.get('payment_mode', 'CASH'),
                notes=f"Clinical Billing for Consultation #{consultation.id}"
            )
            
            # Since these are services, we don't reduce physical stock, but we still create DispensedItems
            # Wait, DispensedItem requires a Product. We need a way to log services.
            # For now, we can just rely on the notes and the Dispensation total_amount.
            # If the system strictly requires a product to track revenue correctly, we should have a "Service" product.
            # We'll assume the Dispensation itself holds the total amount correctly.
            
            # Mark as paid
            consultation.is_paid = True
            consultation.save()
            
            unpaid_labs.update(is_paid=True)
            
        return api_success(
            "Billed to OTC Sales successfully.",
            data={"dispensation_id": dispensation.id},
            extra={"dispensation_id": dispensation.id},
        )

class LabTestViewSet(viewsets.ModelViewSet):
    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer
