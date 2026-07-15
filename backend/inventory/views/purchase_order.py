from decimal import Decimal
import urllib.parse
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.active_branch import get_active_branch, require_active_branch
from users.permissions import IsPharmacistOrAdmin
from config.api_responses import api_success, api_validation_error, api_error, ApiErrorCode
from inventory.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from inventory.models.stock_intake import StockIntake
from inventory.serializers.purchase_order import PurchaseOrderSerializer
from users.utils import log_activity

logger = logging.getLogger(__name__)


def _build_po_text(po):
    """Build a plain-text purchase order message suitable for email body or WhatsApp."""
    branch_name = po.branch.name if po.branch else "N/A"
    lines = [
        f"PURCHASE ORDER — {po.order_number}",
        f"Date: {po.created_at.strftime('%d %b %Y')}",
        f"Branch: {branch_name}",
        f"Expected Delivery: {po.expected_delivery or 'Not specified'}",
        "",
        "─────────────────────────────────────",
        f"{'Product':<35} {'Qty':>6}  {'Unit Price':>12}  {'Total':>12}",
        "─────────────────────────────────────",
    ]
    for item in po.items.select_related("product").all():
        qty = float(item.quantity_ordered)
        price = float(item.estimated_unit_price)
        total = qty * price
        name = (item.product.name or "")[:34]
        lines.append(f"{name:<35} {qty:>6.0f}  KES {price:>9.2f}  KES {total:>9.2f}")
    lines += [
        "─────────────────────────────────────",
        f"{'TOTAL ESTIMATED COST':>54}  KES {float(po.total_estimated_cost):>9.2f}",
        "",
    ]
    if po.notes:
        lines += [f"Notes: {po.notes}", ""]
    lines.append("Please confirm receipt and expected delivery date.")
    return "\n".join(lines)


def _build_po_html(po):
    """Build an HTML email body for the purchase order."""
    branch_name = po.branch.name if po.branch else "N/A"
    rows_html = ""
    for item in po.items.select_related("product").all():
        qty = float(item.quantity_ordered)
        price = float(item.estimated_unit_price)
        total = qty * price
        rows_html += (
            f"<tr>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee'>{item.product.name}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:center'>{qty:.0f}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:right'>KES {price:,.2f}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:right'>KES {total:,.2f}</td>"
            f"</tr>"
        )
    notes_html = f"<p><strong>Notes:</strong> {po.notes}</p>" if po.notes else ""
    return f"""
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#222">
  <h2 style="background:#1e40af;color:#fff;padding:16px 24px;margin:0;border-radius:8px 8px 0 0">
    Purchase Order — {po.order_number}
  </h2>
  <div style="background:#f8fafc;padding:16px 24px;border:1px solid #e2e8f0;border-top:none">
    <p><strong>Branch:</strong> {branch_name}</p>
    <p><strong>Date:</strong> {po.created_at.strftime('%d %b %Y')}</p>
    <p><strong>Expected Delivery:</strong> {po.expected_delivery or 'Not specified'}</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0"
         style="border:1px solid #e2e8f0;border-top:none;border-collapse:collapse">
    <thead>
      <tr style="background:#1e40af;color:#fff">
        <th style="padding:8px 10px;text-align:left">Product</th>
        <th style="padding:8px 10px;text-align:center">Qty</th>
        <th style="padding:8px 10px;text-align:right">Unit Price</th>
        <th style="padding:8px 10px;text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      {rows_html}
    </tbody>
    <tfoot>
      <tr style="background:#f1f5f9;font-weight:bold">
        <td colspan="3" style="padding:8px 10px;text-align:right">Total Estimated Cost</td>
        <td style="padding:8px 10px;text-align:right">KES {float(po.total_estimated_cost):,.2f}</td>
      </tr>
    </tfoot>
  </table>
  {notes_html}
  <p style="margin-top:16px">Please confirm receipt of this order and your expected delivery date.</p>
  <p style="color:#64748b;font-size:12px">This is an automated purchase order from {branch_name}.</p>
</div>
"""


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsPharmacistOrAdmin]

    def get_queryset(self):
        qs = PurchaseOrder.objects.select_related(
            "supplier", "branch", "created_by"
        ).prefetch_related("items", "items__product")
        user = self.request.user
        is_admin = user.is_superuser or getattr(user, "role", None) == "admin"
        status_filter = self.request.query_params.get("status")
        supplier_id = self.request.query_params.get("supplier_id")
        branch_id = self.request.query_params.get("branch_id")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        elif not is_admin and user.branch_id:
            qs = qs.filter(branch_id=user.branch_id)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        denied = require_active_branch(self.request)
        if denied:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Active branch required.")
        branch = get_active_branch(self.request)
        po = serializer.save(
            created_by=self.request.user,
            branch=branch,
            order_number=PurchaseOrder.generate_order_number(),
        )
        log_activity(
            user=self.request.user,
            event_type="PURCHASE_ORDER_CREATED",
            branch=branch,
            details_dict={"po_id": po.id, "order_number": po.order_number},
        )

    @action(detail=True, methods=["post"], url_path="mark-sent")
    def mark_sent(self, request, pk=None):
        po = self.get_object()
        if po.status != "DRAFT":
            return api_validation_error("Only DRAFT orders can be marked as sent.")
        po.status = "SENT"
        po.save(update_fields=["status"])
        return api_success("Purchase order marked as sent.", data=self.get_serializer(po).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        po = self.get_object()
        reason = request.data.get("reason", "").strip()
        if not reason:
            return api_validation_error("Cancellation reason is required.")
        po.status = "CANCELLED"
        po.cancellation_reason = reason
        po.save(update_fields=["status", "cancellation_reason"])
        return api_success("Purchase order cancelled.", data=self.get_serializer(po).data)

    @action(detail=True, methods=["get", "post"])
    def receive(self, request, pk=None):
        po = self.get_object()
        if request.method == "GET":
            return Response(
                {
                    "purchase_order": self.get_serializer(po).data,
                    "prefill": {
                        "supplier_id": po.supplier_id,
                        "branch_id": po.branch_id,
                        "invoice_number": po.order_number,
                        "notes": po.notes or f"Receive PO {po.order_number}",
                        "products": [
                            {
                                "product_id": item.product_id,
                                "product_name": item.product.name,
                                "quantity_received": float(item.quantity_ordered),
                                "cost_price": float(item.estimated_unit_price),
                            }
                            for item in po.items.all()
                        ],
                    },
                }
            )

        if po.status not in ("SENT", "DRAFT"):
            return api_validation_error("This purchase order cannot be received.")

        products_data = request.data.get("products", [])
        if not products_data:
            products_data = [
                {
                    "product_id": item.product_id,
                    "quantity_received": int(item.quantity_ordered),
                    "cost_price": float(item.estimated_unit_price),
                    "expiry_date": request.data.get("expiry_date"),
                    "batch_number": request.data.get("batch_number", ""),
                }
                for item in po.items.all()
            ]

        try:
            with transaction.atomic():
                for p_data in products_data:
                    item = po.items.filter(product_id=p_data.get("product_id")).first()
                    qty = int(p_data.get("quantity_received", 0))
                    cost = Decimal(str(p_data.get("cost_price", 0)))
                    intake = StockIntake(
                        product_id=p_data["product_id"],
                        branch=po.branch,
                        supplier=po.supplier,
                        payment_status=request.data.get("payment_status", "PAID"),
                        invoice_number=po.order_number,
                        quantity_received=qty,
                        unit_cost=cost,
                        expiry_date=p_data.get("expiry_date"),
                        batch_number=p_data.get("batch_number", ""),
                        received_by=request.user,
                        notes=po.notes,
                    )
                    intake.save()
                    if item:
                        item.quantity_received = qty
                        item.actual_unit_price = cost
                        item.save()
                po.status = "RECEIVED"
                po.save(update_fields=["status"])
        except Exception as e:
            return api_error(ApiErrorCode.VALIDATION_ERROR, str(e))

        return api_success(
            "Stock received against purchase order.",
            data=self.get_serializer(po).data,
        )

    @action(detail=True, methods=["post"], url_path="send-order")
    def send_order(self, request, pk=None):
        """
        Send the purchase order to the supplier via email or return a WhatsApp URL.
        POST body: { "channel": "email" | "whatsapp" }
        """
        po = self.get_object()
        channel = (request.data.get("channel") or "email").lower().strip()

        if channel == "email":
            supplier_email = po.supplier.email if po.supplier else None
            if not supplier_email:
                return api_validation_error(
                    f"Supplier '{po.supplier.name}' has no email address on file. "
                    "Please add one under Suppliers first."
                )
            subject = f"Purchase Order {po.order_number} — {po.branch.name if po.branch else 'Pharmacy'}"
            from_email = settings.EMAIL_HOST_USER or "noreply@pharmacy.local"
            plain_text = _build_po_text(po)
            html_content = _build_po_html(po)
            try:
                msg = EmailMultiAlternatives(subject, plain_text, from_email, [supplier_email])
                msg.attach_alternative(html_content, "text/html")
                msg.send()
                log_activity(
                    user=request.user,
                    event_type="PURCHASE_ORDER_EMAILED",
                    branch=po.branch,
                    details_dict={"po_id": po.id, "order_number": po.order_number, "to": supplier_email},
                )
                logger.info("Purchase order %s emailed to %s", po.order_number, supplier_email)
                return api_success(
                    f"Purchase order emailed to {supplier_email}.",
                    data={"sent": True, "to": supplier_email},
                )
            except Exception as exc:
                logger.error("Failed to email PO %s: %s", po.order_number, exc, exc_info=True)
                return api_error(
                    ApiErrorCode.VALIDATION_ERROR,
                    "Email could not be sent. Please check email settings and try again.",
                    http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        elif channel == "whatsapp":
            supplier_phone = po.supplier.phone if po.supplier else None
            if not supplier_phone:
                return api_validation_error(
                    f"Supplier '{po.supplier.name}' has no phone number on file. "
                    "Please add one under Suppliers first."
                )
            # Normalise phone: strip spaces, dashes; ensure it starts with country code
            phone_clean = supplier_phone.strip().replace(" ", "").replace("-", "").replace("+", "")
            if phone_clean.startswith("0"):
                phone_clean = "254" + phone_clean[1:]
            message_text = _build_po_text(po)
            wa_url = f"https://wa.me/{phone_clean}?text={urllib.parse.quote(message_text)}"
            log_activity(
                user=request.user,
                event_type="PURCHASE_ORDER_WHATSAPP",
                branch=po.branch,
                details_dict={"po_id": po.id, "order_number": po.order_number, "phone": phone_clean},
            )
            return api_success(
                "WhatsApp link generated.",
                data={"whatsapp_url": wa_url, "phone": phone_clean, "message_text": message_text},
            )
        else:
            return api_validation_error("Channel must be 'email' or 'whatsapp'.")

