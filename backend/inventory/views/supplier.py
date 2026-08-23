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
    bulk_reorder_intelligence,
    low_stock_reorder_suggestion,
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
    """ViewSet for viewing and editing suppliers.

    SECURITY (C4): Suppliers contain commercially sensitive procurement data.
    Access is restricted to pharmacist/admin roles only.
    Customers must never see supplier data.
    """

    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsPharmacistOrAdmin]  # C4: was IsAuthenticated (customers could access)
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "contact_person", "email", "phone"]
    # Suppliers are a small, bounded set the UI loads whole (client-side search
    # and filtering run over the full list). The global default pagination
    # (PAGE_SIZE=20) silently truncated the list, making any supplier past the
    # first 20 invisible in the frontend. Return the complete list instead.
    pagination_class = None

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

    @action(detail=False, methods=["get"], url_path="reorder-suggestions")
    def reorder_suggestions(self, request):
        """
        Low / out-of-stock items with a recommended supplier and plain-English why.
        Used by Supplier Intelligence for smart restock actions.
        """
        from django.db.models import F
        from products.models import BranchStock
        from users.active_branch import get_active_branch

        user = request.user
        is_admin = user.is_superuser or getattr(user, "role", None) == "admin"
        branch_param = request.query_params.get("branch")
        active = get_active_branch(request)

        qs = (
            BranchStock.objects.filter(
                product__is_active=True,
                quantity__lte=F("reorder_level"),
            )
            .select_related("product", "branch")
            .order_by("quantity", "product__name")
        )

        if is_admin and branch_param and branch_param != "all":
            qs = qs.filter(branch_id=branch_param)
        elif is_admin and active:
            qs = qs.filter(branch_id=active.id)
        elif not is_admin and getattr(user, "branch_id", None):
            qs = qs.filter(branch_id=user.branch_id)
        elif active:
            qs = qs.filter(branch_id=active.id)

        limit = min(int(request.query_params.get("limit") or 40), 100)
        rows = list(qs[:limit])
        intel_map = bulk_reorder_intelligence(
            [bs.product_id for bs in rows],
            # Prefer active/request branch; per-row branch used as fallback below
            active.id if active else (rows[0].branch_id if rows else None),
            include_comparison=False,
        )
        suggestions = []
        for bs in rows:
            intel = intel_map.get(bs.product_id) or {}
            # If row branch differs, still fine — qty tip is branch-scoped via active
            best = intel.get("best_supplier") or {}
            qty = float(bs.quantity)
            level = float(bs.reorder_level or 0)
            urgency = "out" if qty <= 0 else "low"
            suggestions.append(
                {
                    "product_id": bs.product_id,
                    "product_name": bs.product.name,
                    "branch_id": bs.branch_id,
                    "branch_name": bs.branch.name if bs.branch else None,
                    "stock_quantity": qty,
                    "reorder_level": level,
                    "urgency": urgency,
                    "suggested_quantity": intel.get("suggested_quantity"),
                    "recommended_supplier_id": best.get("supplier_id"),
                    "recommended_supplier_name": best.get("supplier_name"),
                    "recommended_unit_price": best.get("last_price"),
                    "reason": intel.get("reason") or "",
                    "usual_supplier": intel.get("usual_supplier"),
                    "alternative_supplier": intel.get("alternative_supplier"),
                }
            )

        with_supplier = sum(1 for s in suggestions if s["recommended_supplier_id"])
        out_count = sum(1 for s in suggestions if s["urgency"] == "out")
        summary = (
            f"{len(suggestions)} item(s) need restock"
            + (f" ({out_count} out of stock)" if out_count else "")
            + (
                f". We can recommend a supplier for {with_supplier} of them."
                if with_supplier
                else ". Add Stock received history to unlock supplier recommendations."
            )
        )
        return Response({"summary": summary, "count": len(suggestions), "suggestions": suggestions})

    @action(detail=False, methods=["get"], url_path="restock-needs")
    def restock_needs(self, request):
        """
        Admin-only: low/out-of-stock across all branches, grouped by branch.
        Active branch is listed first. Includes Supplier Intel reorder tips.
        """
        from django.db.models import Count, Exists, F, OuterRef, Q
        from products.models import BranchStock
        from users.active_branch import get_active_branch
        from users.models import Branch
        from inventory.services.supplier_intelligence import (
            bulk_reorder_intelligence,
            bulk_suggested_order_quantities,
        )

        user = request.user
        is_admin = user.is_superuser or getattr(user, "role", None) == "admin"
        if not is_admin:
            return Response(
                {"detail": "Only admins can view network restock needs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            active = get_active_branch(request)
            active_id = active.id if active else None
            try:
                per_branch = min(int(request.query_params.get("per_branch") or 60), 150)
            except (TypeError, ValueError):
                per_branch = 60

            # Only flag out-of-stock when this branch has received that product before.
            # Avoids thousands of never-stocked zero rows (one BranchStock per product/branch).
            had_intake_here = StockIntake.objects.filter(
                product_id=OuterRef("product_id"),
                branch_id=OuterRef("branch_id"),
            )
            base_filter = Q(product__is_active=True) & Q(quantity__lte=F("reorder_level")) & (
                Q(quantity__gt=0) | Exists(had_intake_here)
            )

            count_rows = (
                BranchStock.objects.filter(base_filter)
                .values("branch_id")
                .annotate(
                    total=Count("id"),
                    out_count=Count("id", filter=Q(quantity__lte=0)),
                )
            )
            count_map = {r["branch_id"]: r for r in count_rows}

            branch_ids = [bid for bid in count_map.keys() if bid is not None]
            branch_name_map = {
                b.id: b.name
                for b in Branch.objects.filter(id__in=branch_ids).only("id", "name")
            }

            by_branch = {}
            all_product_ids = []
            for bid in branch_ids:
                stats = count_map[bid]
                rows = list(
                    BranchStock.objects.filter(base_filter, branch_id=bid)
                    .select_related("product")
                    .order_by("quantity", "product__name")[:per_branch]
                )
                by_branch[bid] = {
                    "branch_id": bid,
                    "branch_name": branch_name_map.get(bid) or f"Branch #{bid}",
                    "is_active": bid == active_id,
                    "total": int(stats["total"] or 0),
                    "out_count": int(stats["out_count"] or 0),
                    "items": rows,
                }
                all_product_ids.extend(bs.product_id for bs in rows)

            unique_pids = list({pid for pid in all_product_ids})
            intel_map = (
                bulk_reorder_intelligence(unique_pids, active_id, include_comparison=False)
                if unique_pids
                else {}
            )

            qty_by_branch = {}
            for bid, bucket in by_branch.items():
                pids = [bs.product_id for bs in bucket["items"]]
                qty_by_branch[bid] = (
                    bulk_suggested_order_quantities(pids, bid) if pids else {}
                )

            branches_out = []
            for bid, bucket in by_branch.items():
                items = []
                for bs in bucket["items"]:
                    intel = intel_map.get(bs.product_id) or {}
                    best = intel.get("best_supplier") or {}
                    qty = float(bs.quantity)
                    level = float(bs.reorder_level or 0)
                    items.append(
                        {
                            "product_id": bs.product_id,
                            "product_name": bs.product.name,
                            "branch_id": bs.branch_id,
                            "branch_name": bucket["branch_name"],
                            "stock_quantity": qty,
                            "reorder_level": level,
                            "urgency": "out" if qty <= 0 else "low",
                            "suggested_quantity": qty_by_branch.get(bid, {}).get(
                                bs.product_id, intel.get("suggested_quantity")
                            ),
                            "recommended_supplier_id": best.get("supplier_id"),
                            "recommended_supplier_name": best.get("supplier_name"),
                            "recommended_unit_price": best.get("last_price"),
                            "reason": intel.get("reason") or "",
                        }
                    )
                branches_out.append(
                    {
                        "branch_id": bucket["branch_id"],
                        "branch_name": bucket["branch_name"],
                        "is_active": bucket["is_active"],
                        "count": bucket["total"],
                        "out_count": bucket["out_count"],
                        "listed": len(items),
                        "items": items,
                    }
                )

            branches_out.sort(
                key=lambda b: (
                    0 if b["is_active"] else 1,
                    -b["count"],
                    b["branch_name"] or "",
                )
            )
            total = sum(b["count"] for b in branches_out)
            out_total = sum(b["out_count"] for b in branches_out)
            summary = (
                f"{total} product(s) need restock across {len(branches_out)} branch(es)"
                + (f" ({out_total} out of stock)" if out_total else "")
                + ". Order from your current branch first; switch branch to restock elsewhere."
            )
            return Response(
                {
                    "summary": summary,
                    "total_count": total,
                    "active_branch_id": active_id,
                    "active_branch_name": active.name if active else None,
                    "branches": branches_out,
                }
            )
        except Exception:
            import logging

            logging.getLogger(__name__).exception("restock_needs failed")
            return Response(
                {
                    "detail": "Could not load restock needs right now. Please try again in a moment."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="procurement-analytics")
    def procurement_analytics_view(self, request):
        # Access already gated by IsPharmacistOrAdmin on the viewset.
        # Keep this endpoint fast — the old per-product loop timed out on Render.
        try:
            return Response(procurement_analytics())
        except Exception:
            import logging

            logging.getLogger(__name__).exception("procurement_analytics failed")
            return Response(
                {
                    "detail": "Could not analyse supplier prices right now. Please try again in a moment."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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
