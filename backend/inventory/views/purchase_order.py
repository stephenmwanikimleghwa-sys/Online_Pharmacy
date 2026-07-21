from decimal import Decimal

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
