from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

from ..models import Quotation, QuotationItem
from ..serializers import QuotationSerializer

from inventory.models.dispensing import Dispensation, DispensationItem
from products.models import BranchStock

class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.all()
    serializer_class = QuotationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Quotation.objects.none()
            
        qs = super().get_queryset()
        
        # Filter by branch
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
            
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
            
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def convert_to_sale(self, request, pk=None):
        quotation = self.get_object()
        
        if quotation.status == 'converted':
            return Response(
                {"error": "Quotation has already been converted to a sale."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if quotation.status == 'expired':
            return Response(
                {"error": "Cannot convert an expired quotation."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # 1. Create Dispensation
            dispensation = Dispensation.objects.create(
                branch=quotation.branch,
                dispensed_by=request.user,
                customer_name=quotation.customer_name,
                customer_phone=quotation.customer_phone,
                total_amount=quotation.total_amount,
                status='completed',
                payment_method=request.data.get('payment_method', 'CASH'),
                notes=f"Converted from Quotation #{quotation.id}. {request.data.get('notes', '')}"
            )
            
            # 2. Create DispensationItems and update BranchStock
            for q_item in quotation.items.all():
                DispensationItem.objects.create(
                    dispensation=dispensation,
                    product=q_item.product,
                    quantity=q_item.quantity,
                    unit_price=q_item.unit_price,
                    subtotal=q_item.subtotal
                )
                
                # Update branch stock
                # Note: DispensationItem.save() might already handle stock reduction if we refactored it
                # Let's check how DispensationItem.save() works in the current system. 
                # According to the previous session, DispensationItem.save() handles atomic branch stock reduction.
                # So creating it here will automatically decrement stock!
            
            # 3. Update Quotation Status
            quotation.status = 'converted'
            quotation.save()
            
        return Response({
            "message": "Quotation successfully converted to sale.",
            "dispensation_id": dispensation.id
        })

    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        quotation = self.get_object()
        from utils.pdf_generator import PDFGenerator
        from django.http import FileResponse
        from django.utils import timezone
        
        # Prepare data for PDF generator
        data = {
            "Quotation ID": str(quotation.id),
            "Customer Name": quotation.customer_name,
            "Customer Phone": quotation.customer_phone,
            "Branch": quotation.branch.name if quotation.branch else "N/A",
            "Created By": quotation.created_by.get_full_name() or quotation.created_by.username,
            "Valid Until": quotation.valid_until.strftime('%Y-%m-%d'),
            "Total Amount (KES)": float(quotation.total_amount),
            "Status": quotation.status.upper(),
            "Notes": quotation.notes,
            "Items": [
                {
                    "Product": item.product.name,
                    "Quantity": item.quantity,
                    "Unit Price": float(item.unit_price),
                    "Subtotal": float(item.subtotal)
                } for item in quotation.items.all()
            ]
        }

        generator = PDFGenerator()
        pdf_buffer = generator.generate_quotation_pdf(data, title=f"Quotation #{quotation.id}")
        
        filename = f"quotation_{quotation.id}_{timezone.now().strftime('%Y%m%d')}.pdf"
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf'
        )
