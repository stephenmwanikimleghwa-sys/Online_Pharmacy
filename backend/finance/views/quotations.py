from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone

from ..models import Quotation
from ..serializers import QuotationSerializer

from inventory.models.dispensing import Dispensation, DispensationItem
from inventory.models.finance import CashFlow
from products.models import BranchStock
from config.api_responses import ApiErrorCode, api_error, api_success, api_validation_error


class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.all()
    serializer_class = QuotationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Quotation.objects.none()

        qs = super().get_queryset().select_related('branch', 'created_by').prefetch_related('items__product')

        branch_id = self.request.query_params.get('branch')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

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
            return api_validation_error("Quotation has already been converted to a sale.")

        if quotation.status == 'expired':
            return api_validation_error("Cannot convert an expired quotation.")

        if not quotation.branch_id:
            return api_validation_error("This quotation has no branch. Edit it and set a branch before converting.")

        items = list(quotation.items.select_related('product').all())
        if not items:
            return api_validation_error("This quotation has no line items to convert.")

        payment_mode = (
            request.data.get('payment_mode')
            or request.data.get('payment_method')
            or 'CASH'
        )
        allowed_modes = {c[0] for c in Dispensation.PAYMENT_MODES}
        if payment_mode not in allowed_modes:
            return api_validation_error(
                f"Invalid payment mode '{payment_mode}'.",
                details={"payment_mode": payment_mode, "allowed": sorted(allowed_modes)},
            )

        with transaction.atomic():
            # Stock check before creating the sale
            shortfalls = []
            for q_item in items:
                stock = (
                    BranchStock.objects.select_for_update()
                    .filter(product=q_item.product, branch=quotation.branch)
                    .first()
                )
                available = int(stock.quantity) if stock else 0
                if available < q_item.quantity:
                    shortfalls.append({
                        "product_id": q_item.product_id,
                        "product_name": q_item.product.name,
                        "requested": q_item.quantity,
                        "available": available,
                    })
            if shortfalls:
                names = ", ".join(s["product_name"] for s in shortfalls[:3])
                more = f" (+{len(shortfalls) - 3} more)" if len(shortfalls) > 3 else ""
                return api_error(
                    ApiErrorCode.INSUFFICIENT_STOCK,
                    f"Not enough stock to convert this quotation: {names}{more}.",
                    details={"shortfalls": shortfalls},
                    http_status=400,
                )

            dispensation = Dispensation.objects.create(
                sale_type='otc',
                branch=quotation.branch,
                dispensed_by=request.user,
                patient_name=quotation.customer_name or '',
                total_amount=quotation.total_amount,
                payment_mode=payment_mode,
                pricing_tier='RETAIL',
                notes=(
                    f"Converted from Quotation #{quotation.id}."
                    + (f" {request.data.get('notes')}" if request.data.get('notes') else "")
                    + (f" Phone: {quotation.customer_phone}" if quotation.customer_phone else "")
                ).strip(),
            )

            for q_item in items:
                DispensationItem.objects.create(
                    dispensation=dispensation,
                    product=q_item.product,
                    quantity=q_item.quantity,
                    price_per_unit=q_item.unit_price,
                    total_price=q_item.subtotal,
                    expiry_date=getattr(q_item.product, 'expiry_date', None),
                )

            CashFlow.objects.create(
                netflow=quotation.total_amount,
                paymentmode=payment_mode,
                explanation=f"Quotation #{quotation.id} → Dispensation #{dispensation.id}",
                branch=quotation.branch,
                timestamp=timezone.now(),
            )

            quotation.status = 'converted'
            quotation.save(update_fields=['status', 'updated_at'])

            from users.utils import log_activity
            log_activity(
                user=request.user,
                event_type='SALE_MADE',
                branch=quotation.branch,
                details_dict={
                    'dispensation_id': dispensation.id,
                    'total_amount': float(quotation.total_amount),
                    'items_count': len(items),
                    'source': 'quotation_convert',
                    'quotation_id': quotation.id,
                    'payment_mode': payment_mode,
                },
            )

        return api_success(
            "Quotation successfully converted to sale.",
            data={"dispensation_id": dispensation.id},
            extra={"dispensation_id": dispensation.id},
        )

    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        quotation = self.get_object()
        from utils.pdf_generator import PDFGenerator
        from django.http import FileResponse

        data = {
            "Quotation ID": str(quotation.id),
            "Customer Name": quotation.customer_name,
            "Customer Phone": quotation.customer_phone,
            "Branch": quotation.branch.name if quotation.branch else "N/A",
            "Created By": (
                quotation.created_by.get_full_name() or quotation.created_by.username
                if quotation.created_by
                else "N/A"
            ),
            "Valid Until": quotation.valid_until.strftime('%Y-%m-%d') if quotation.valid_until else "N/A",
            "Total Amount (KES)": float(quotation.total_amount),
            "Status": quotation.status.upper(),
            "Notes": quotation.notes,
            "Items": [
                {
                    "Product": item.product.name,
                    "Quantity": item.quantity,
                    "Unit Price": float(item.unit_price),
                    "Subtotal": float(item.subtotal),
                }
                for item in quotation.items.all()
            ],
        }

        generator = PDFGenerator()
        pdf_buffer = generator.generate_quotation_pdf(data, title=f"Quotation #{quotation.id}")

        filename = f"quotation_{quotation.id}_{timezone.now().strftime('%Y%m%d')}.pdf"
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf',
        )
