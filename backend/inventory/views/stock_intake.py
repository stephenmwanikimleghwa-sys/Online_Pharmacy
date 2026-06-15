from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.active_branch import get_active_branch, require_active_branch
from django.db.models import Q, Sum
from django.utils import timezone
from ..models.stock_intake import StockIntake
from ..serializers.stock_intake import StockIntakeSerializer, StockIntakeDetailSerializer
from config.api_responses import ApiErrorCode, api_error, api_success
from users.utils import log_activity


class StockIntakeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing stock intake records.
    Only admins and pharmacists can record new stock intakes.
    """
    queryset = StockIntake.objects.select_related('product', 'received_by').all()
    serializer_class = StockIntakeSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create', 'update', 'partial_update']:
            return StockIntakeDetailSerializer
        return StockIntakeSerializer

    def get_queryset(self):
        """Filter queryset based on user role and query params."""
        if getattr(self, 'swagger_fake_view', False):
            return StockIntake.objects.none()
            
        user = self.request.user
        queryset = StockIntake.objects.select_related('product', 'received_by', 'branch').all()

        # Customers see nothing
        user_role = getattr(user, 'role', None)
        if user_role == 'customer':
            return queryset.none()

        # ---- Branch scoping ----
        is_admin = user.is_superuser or user_role == 'admin'
        branch_param = self.request.query_params.get('branch')
        if is_admin and branch_param and branch_param != 'all':
            queryset = queryset.filter(branch_id=branch_param)
        elif not is_admin and user.branch:
            queryset = queryset.filter(branch=user.branch)

        # Filter by product if provided
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        # Filter by supplier
        supplier_id = self.request.query_params.get('supplier_id')
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(received_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(received_date__lte=end_date)

        return queryset.order_by('-received_date')

    def create(self, request, *args, **kwargs):
        """Create a new stock intake record."""
        if request.user.role not in ['admin', 'pharmacist']:
            return Response(
                {'detail': 'Only admins and pharmacists can record stock intake.'},
                status=status.HTTP_403_FORBIDDEN
            )
        denied = require_active_branch(request)
        if denied:
            return denied
        branch = get_active_branch(request)
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(received_by=request.user, branch=branch)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary statistics for stock intake."""
        queryset = self.get_queryset()
        
        summary_data = {
            'total_records': queryset.count(),
            'total_quantity_received': queryset.aggregate(Sum('quantity_received'))['quantity_received__sum'] or 0,
            'total_cost': queryset.aggregate(Sum('total_cost'))['total_cost__sum'] or 0,
            'suppliers': queryset.values_list('supplier_id', flat=True).distinct().count(),
        }
        
        return Response(summary_data)

    @action(detail=False, methods=['post'])
    def bulk(self, request):
        """
        Create multiple stock intake records under a single invoice.
        Updates product pricing, branch stock, and supplier credit exactly once if CREDIT.
        """
        from django.db import transaction
        from users.models import Branch
        from products.models import Product, PricingTier, BranchStock, StockLog
        from inventory.models.supplier import Supplier, SupplierCreditTransaction
        
        denied = require_active_branch(request)
        if denied:
            return denied
        active_branch = get_active_branch(request)

        data = request.data
        supplier_id = data.get('supplier_id')
        branch_id = data.get('branch_id') or (active_branch.id if active_branch else None)
        invoice_number = data.get('invoice_number', '')
        payment_status = data.get('payment_status', 'PAID')
        products_data = data.get('products', [])
        notes = data.get('notes', '')

        missing = []
        if not supplier_id:
            missing.append("Supplier")
        if not branch_id:
            missing.append("Branch")
        if not products_data:
            missing.append("Products")
        if missing:
            return api_error(
                ApiErrorCode.VALIDATION_ERROR,
                f"Please fill in all required fields: {', '.join(missing)}.",
                details={"missing_fields": missing},
            )

        try:
            supplier = Supplier.objects.get(id=supplier_id)
            branch = Branch.objects.get(id=branch_id)
        except Supplier.DoesNotExist:
            return api_error(
                ApiErrorCode.SUPPLIER_NOT_FOUND,
                "The selected supplier could not be found.",
                http_status=status.HTTP_404_NOT_FOUND,
            )
        except Branch.DoesNotExist:
            return api_error(
                ApiErrorCode.BRANCH_ACCESS_DENIED,
                "The selected branch could not be found.",
                http_status=status.HTTP_404_NOT_FOUND,
            )

        total_invoice_cost = 0
        intake_records = []

        try:
            with transaction.atomic():
                for p_data in products_data:
                    product_id = p_data.get('product_id')
                    quantity_received = int(p_data.get('quantity_received', 0))
                    cost_price = float(p_data.get('cost_price', 0))
                    selling_price = float(p_data.get('selling_price', 0))
                    wholesale_price = float(p_data.get('wholesale_price', 0))
                    expiry_date = p_data.get('expiry_date') or None
                    batch_number = p_data.get('batch_number', '')

                    if quantity_received <= 0:
                        continue

                    if product_id:
                        try:
                            product = Product.objects.get(id=product_id)
                        except Product.DoesNotExist:
                            continue
                    else:
                        # Create new product dynamically
                        product_name = p_data.get('product_name', '').strip()
                        if not product_name:
                            continue
                        product = Product.objects.create(
                            name=product_name,
                            price=selling_price or cost_price or 0,
                            created_by=request.user
                        )

                    # Update pricing
                    tier, _ = PricingTier.objects.get_or_create(product=product, defaults={'buying_price': cost_price, 'retail_price': selling_price, 'wholesale_price': wholesale_price})
                    if cost_price: tier.buying_price = cost_price
                    if selling_price: tier.retail_price = selling_price
                    if wholesale_price: tier.wholesale_price = wholesale_price
                    tier.save()
                    if selling_price:
                        product.price = selling_price
                        product.save(update_fields=['price'])

                    total_cost = cost_price * quantity_received
                    total_invoice_cost += total_cost

                    # Create intake
                    intake = StockIntake(
                        product=product,
                        branch=branch,
                        supplier=supplier,
                        payment_status=payment_status,
                        invoice_number=invoice_number,
                        quantity_received=quantity_received,
                        unit_cost=cost_price,
                        expiry_date=expiry_date,
                        batch_number=batch_number,
                        received_by=request.user,
                        notes=notes
                    )
                    intake._skip_credit = True
                    intake.save()
                    intake_records.append(intake.id)
                    
                    # Log activity
                    log_activity(
                        user=request.user,
                        event_type='PRODUCT_RESTOCKED',
                        branch=branch,
                        ip_address=request.META.get('REMOTE_ADDR'),
                        details_dict={
                            'product_id': product.id,
                            'product_name': product.name,
                            'quantity_received': quantity_received,
                            'supplier': supplier.name,
                            'invoice_number': invoice_number,
                            'intake_id': intake.id
                        }
                    )

                # Single credit update
                if payment_status in ['CREDIT', 'PARTIAL'] and total_invoice_cost > 0:
                    supplier.balance += total_invoice_cost
                    supplier.save(update_fields=['balance'])
                    
                    SupplierCreditTransaction.objects.create(
                        supplier=supplier,
                        transaction_type='PURCHASE_ON_CREDIT',
                        amount=total_invoice_cost,
                        balance_after=supplier.balance,
                        description=f"Bulk Stock Intake Invoice #{invoice_number} ({len(intake_records)} products)",
                        invoice_number=invoice_number,
                        created_by=request.user
                    )
            
            product_count = len(intake_records)
            return api_success(
                f"{product_count} product(s) added to {branch.name} stock from {supplier.name}.",
                data={"intakes": intake_records},
                extra={"intakes": intake_records},
                http_status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return api_error(
                ApiErrorCode.VALIDATION_ERROR,
                str(e) or "Stock intake could not be completed.",
            )

    @action(detail=False, methods=['get'])
    def supplier_history(self, request):
        """Get supplier history and prices for a specific product."""
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response([])

        queryset = self.get_queryset().filter(product_id=product_id)
        
        # Group by supplier and get the most recent price and date
        history = {}
        for record in queryset:
            supplier_id = record.supplier.id if record.supplier else None
            supplier_name = record.supplier.name if record.supplier else "Unknown"
            
            if not supplier_id:
                continue

            if supplier_id not in history or record.received_date > history[supplier_id]['last_received_date']:
                history[supplier_id] = {
                    'supplier_id': supplier_id,
                    'supplier_name': supplier_name,
                    'unit_cost': float(record.unit_cost),
                    'last_received_date': record.received_date,
                    'quantity': record.quantity_received
                }

        # Sort by most recent first
        history_list = list(history.values())
        history_list.sort(key=lambda x: x['last_received_date'], reverse=True)
        return Response(history_list)

    @action(detail=False, methods=['get'])
    def by_supplier(self, request):
        """Get stock intake records grouped by supplier."""
        queryset = self.get_queryset()
        
        suppliers = {}
        for record in queryset:
            supplier_name = record.supplier.name if record.supplier else "Unknown"
            if supplier_name not in suppliers:
                suppliers[supplier_name] = {
                    'name': supplier_name,
                    'total_quantity': 0,
                    'total_cost': 0,
                    'records_count': 0,
                    'latest_date': None,
                }
            
            suppliers[supplier_name]['total_quantity'] += record.quantity_received
            suppliers[supplier_name]['total_cost'] += float(record.total_cost)
            suppliers[supplier_name]['records_count'] += 1
            
            if not suppliers[supplier_name]['latest_date'] or \
               record.received_date > suppliers[supplier_name]['latest_date']:
                suppliers[supplier_name]['latest_date'] = record.received_date

        return Response(list(suppliers.values()))

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get stock that is expiring within 3 months."""
        from datetime import timedelta
        
        queryset = self.get_queryset()
        soon = timezone.now() + timedelta(days=90)
        
        expiring_stock = queryset.filter(
            expiry_date__isnull=False,
            expiry_date__lte=soon,
            expiry_date__gte=timezone.now()
        ).order_by('expiry_date')
        
        serializer = self.get_serializer(expiring_stock, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get stock that has already expired."""
        queryset = self.get_queryset()
        expired_stock = queryset.filter(
            expiry_date__isnull=False,
            expiry_date__lt=timezone.now()
        ).order_by('expiry_date')
        
        serializer = self.get_serializer(expired_stock, many=True)
        return Response(serializer.data)
