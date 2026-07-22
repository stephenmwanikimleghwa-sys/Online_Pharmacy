from django.db import transaction
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from users.active_branch import get_active_branch, require_active_branch
from users.permissions import IsPharmacistOrAdmin
from inventory.models.supplier import Supplier, SupplierCreditTransaction
from inventory.models.stock_intake import StockIntake
from inventory.serializers.supplier import SupplierSerializer
from inventory.services.supplier_intelligence import (
    compare_suppliers_for_product,
    supplier_products_summary,
    last_price_for_supplier_product,
    supplier_scorecard,
    procurement_analytics,
    suggested_order_quantity,
)
from config.api_responses import api_success, api_validation_error
from users.utils import log_activity


def _user_can_see_transfer_details(user):
    if user.is_superuser or getattr(user, "role", None) == "admin":
        return True
    if getattr(user, "can_transfer_stock", False):
        return True
    flags = getattr(user, "permission_flags", None) or {}
    return bool(flags.get("can_transfer_stock"))


class SupplierViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing suppliers."""

    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "contact_person", "email", "phone"]

    @action(detail=False, methods=["get"], url_path="compare")
    def compare(self, request):
        product_id = request.query_params.get("product_id")
        if not product_id:
            return api_validation_error("product_id is required.")
        data = compare_suppliers_for_product(product_id)
        if not data:
            return api_validation_error("Product not found.")
        return Response(data)

    @action(detail=False, methods=["get"], url_path="last-price")
    def last_price(self, request):
        product_id = request.query_params.get("product_id")
        supplier_id = request.query_params.get("supplier_id")
        if not product_id or not supplier_id:
            return api_validation_error("product_id and supplier_id are required.")
        return Response(last_price_for_supplier_product(product_id, supplier_id))

    @action(detail=False, methods=["get"], url_path="procurement-analytics")
    def procurement_analytics_view(self, request):
        if not (
            request.user.is_superuser
            or getattr(request.user, "role", None) == "admin"
            or getattr(request.user, "can_view_reports", False)
        ):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return Response(procurement_analytics())

    @action(detail=True, methods=["get"], url_path="products-supplied")
    def products_supplied(self, request, pk=None):
        return Response(supplier_products_summary(pk))

    @action(detail=True, methods=["get"], url_path="scorecard")
    def scorecard(self, request, pk=None):
        data = supplier_scorecard(pk)
        if not data:
            return api_validation_error("Supplier not found.")
        return Response(data)

    @action(detail=True, methods=["get"])
    def ledger(self, request, pk=None):
        supplier = self.get_object()
        debt_txs = SupplierCreditTransaction.objects.filter(supplier=supplier).order_by(
            "-timestamp"
        )
        debt_history = [
            {
                "id": tx.id,
                "type": tx.transaction_type,
                "amount": str(tx.amount),
                "balance_after": str(tx.balance_after),
                "description": tx.description,
                "invoice_number": tx.invoice_number,
                "timestamp": tx.timestamp.isoformat(),
                "cashier": tx.created_by.username if tx.created_by else None,
            }
            for tx in debt_txs
        ]
        intakes = StockIntake.objects.filter(supplier=supplier).order_by("-received_date")
        purchase_history = [
            {
                "id": intake.id,
                "product_name": intake.product.name,
                "quantity": intake.quantity_received,
                "unit_cost": str(intake.unit_cost),
                "total_cost": str(intake.total_cost),
                "payment_status": intake.payment_status,
                "invoice_number": intake.invoice_number,
                "timestamp": intake.received_date.isoformat(),
                "branch": intake.branch.name if intake.branch else None,
                "received_by": intake.received_by.username if intake.received_by else None,
            }
            for intake in intakes
        ]
        return Response(
            {"debt_transactions": debt_history, "purchase_history": purchase_history}
        )

    @action(detail=True, methods=["post"])
    def record_payment(self, request, pk=None):
        supplier = self.get_object()
        amount_str = request.data.get("amount")
        payment_mode = request.data.get("payment_mode", "CASH")
        invoice_number = request.data.get("invoice_number", "")
        notes = request.data.get("notes", "")

        try:
            amount = float(amount_str)
            if amount <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return api_validation_error(
                "Please enter a valid positive payment amount.",
                details={"amount": amount_str},
            )

        with transaction.atomic():
            locked_supplier = Supplier.objects.select_for_update().get(id=supplier.id)
            locked_supplier.balance -= amount
            locked_supplier.save()
            tx = SupplierCreditTransaction.objects.create(
                supplier=locked_supplier,
                transaction_type="PAYMENT",
                amount=amount,
                balance_after=locked_supplier.balance,
                description=f"Payment via {payment_mode}. {notes}",
                invoice_number=invoice_number,
                created_by=request.user,
            )
            receipt = {
                "transaction_id": tx.id,
                "supplier_name": locked_supplier.name,
                "amount_paid": str(tx.amount),
                "remaining_balance": str(locked_supplier.balance),
                "payment_mode": payment_mode,
                "invoice_number": invoice_number,
                "timestamp": tx.timestamp.isoformat(),
                "cashier": request.user.username,
            }

        return api_success(
            f"KES {amount:,.2f} paid to {locked_supplier.name}. "
            f"Remaining balance: KES {float(locked_supplier.balance):,.2f}.",
            data={"receipt": receipt, "new_balance": str(locked_supplier.balance)},
            extra={"receipt": receipt, "new_balance": str(locked_supplier.balance)},
        )


def low_stock_reorder_suggestion(product_id, branch_id):
    comparison = compare_suppliers_for_product(product_id)
    ranked = (comparison or {}).get("comparison") or []
    cheapest = ranked[0] if ranked else None
    alt = ranked[1] if len(ranked) > 1 else None
    suggested_qty = suggested_order_quantity(product_id, branch_id)
    return {
        "suggested_quantity": suggested_qty,
        "best_supplier": cheapest,
        "alternative_supplier": alt,
        "comparison": comparison,
    }
