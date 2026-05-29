import csv
from datetime import datetime
from django.db.models import F
from django.http import HttpResponse, StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin
from products.models import Product, StockLog, BranchStock
from ..models import RestockRequest

class Echo:
    """An object that implements just the write method of the file-like
    interface, for use with StreamingHttpResponse."""
    def write(self, value):
        """Write the value by returning it, instead of storing in a buffer."""
        return value

def stream_csv(rows, filename):
    """Helper function to stream CSV files."""
    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)
    response = StreamingHttpResponse(
        (writer.writerow(row) for row in rows),
        content_type="text/csv"
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

@api_view(['GET'])
@permission_classes([IsPharmacistOrAdmin])
def export_inventory(request):
    """Export current inventory to CSV."""
    category = request.GET.get('category')
    low_stock = request.GET.get('low_stock') == 'true'
    out_of_stock = request.GET.get('out_of_stock') == 'true'
    branch_param = request.GET.get('branch')
    
    user = request.user
    is_admin = getattr(user, 'role', None) == 'admin' or user.is_superuser
    
    # Base queryset
    products = Product.objects.filter(is_active=True).prefetch_related('branch_stocks')

    if category:
        products = products.filter(category=category)

    # Prepare CSV headers and rows
    headers = [
        'ID', 'Name', 'Category', 'Supplier', 'Branch', 'Stock Quantity',
        'Reorder Threshold', 'Price', 'Last Updated', 'Status'
    ]
    
    def get_rows():
        yield headers
        for product in products:
            branch_stocks = list(product.branch_stocks.all())
            
            target_stocks = branch_stocks
            if is_admin and branch_param and branch_param != 'all':
                target_stocks = [bs for bs in branch_stocks if bs.branch_id == int(branch_param)]
            elif not is_admin and user.branch:
                target_stocks = [bs for bs in branch_stocks if bs.branch_id == user.branch.id]
                
            if not target_stocks and not (low_stock or out_of_stock):
                # Export 0 stock line
                yield [
                    product.id, product.name, product.category, product.supplier or '',
                    user.branch.name if user.branch else 'All Branches',
                    0, product.reorder_threshold, product.price,
                    product.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'Out of Stock'
                ]
                continue
                
            for bs in target_stocks:
                if out_of_stock and bs.quantity > 0:
                    continue
                if low_stock and (bs.quantity > bs.reorder_level or bs.quantity <= 0):
                    continue
                    
                status_str = 'Out of Stock' if bs.quantity == 0 else (
                    'Low Stock' if bs.quantity <= bs.reorder_level else 'In Stock'
                )
                yield [
                    product.id,
                    product.name,
                    product.category,
                    product.supplier or '',
                    bs.branch.name if bs.branch else 'Unknown',
                    bs.quantity,
                    bs.reorder_level,
                    product.price,
                    bs.last_updated.strftime('%Y-%m-%d %H:%M:%S'),
                    status_str
                ]

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'inventory_export_{timestamp}.csv'
    return stream_csv(get_rows(), filename)

@api_view(['GET'])
@permission_classes([IsPharmacistOrAdmin])
def export_stock_logs(request):
    """Export stock logs to CSV."""
    product_id = request.GET.get('product_id')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    change_type = request.GET.get('change_type')
    branch_param = request.GET.get('branch')

    user = request.user
    is_admin = getattr(user, 'role', None) == 'admin' or user.is_superuser

    logs = StockLog.objects.select_related('product', 'logged_by', 'branch').order_by('-timestamp')

    if is_admin and branch_param and branch_param != 'all':
        logs = logs.filter(branch_id=branch_param)
    elif not is_admin and user.branch:
        logs = logs.filter(branch=user.branch)

    if product_id:
        logs = logs.filter(product_id=product_id)
    if start_date:
        logs = logs.filter(timestamp__gte=start_date)
    if end_date:
        logs = logs.filter(timestamp__lte=end_date)
    if change_type:
        logs = logs.filter(change_type=change_type)

    headers = [
        'ID', 'Timestamp', 'Product', 'Branch', 'Previous Quantity', 'New Quantity',
        'Change Amount', 'Change Type', 'Reason', 'Logged By'
    ]
    
    def get_rows():
        yield headers
        for log in logs:
            yield [
                log.id,
                log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                log.product.name,
                log.branch.name if log.branch else 'Unknown',
                log.previous_quantity,
                log.new_quantity,
                log.change_amount,
                log.get_change_type_display(),
                log.reason,
                log.logged_by.username if log.logged_by else 'System'
            ]

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'stock_logs_export_{timestamp}.csv'
    return stream_csv(get_rows(), filename)

@api_view(['GET'])
@permission_classes([IsPharmacistOrAdmin])
def export_restock_requests(request):
    """Export restock requests to CSV."""
    status = request.GET.get('status')
    product_id = request.GET.get('product_id')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    branch_param = request.GET.get('branch')

    user = request.user
    is_admin = getattr(user, 'role', None) == 'admin' or user.is_superuser

    requests = RestockRequest.objects.select_related(
        'product', 'requested_by', 'approved_by', 'branch'
    ).order_by('-created_at')

    if is_admin and branch_param and branch_param != 'all':
        requests = requests.filter(branch_id=branch_param)
    elif not is_admin and user.branch:
        requests = requests.filter(branch=user.branch)

    if status:
        requests = requests.filter(status=status)
    if product_id:
        requests = requests.filter(product_id=product_id)
    if start_date:
        requests = requests.filter(created_at__gte=start_date)
    if end_date:
        requests = requests.filter(created_at__lte=end_date)

    headers = [
        'ID', 'Created At', 'Product', 'Branch', 'Requested By', 'Approved By',
        'Requested Quantity', 'Current Quantity', 'Status', 'Supplier',
        'Estimated Cost', 'Notes', 'Completed At'
    ]
    
    def get_rows():
        yield headers
        for req in requests:
            yield [
                req.id,
                req.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                req.product.name,
                req.branch.name if hasattr(req, 'branch') and req.branch else 'Unknown',
                req.requested_by.username,
                req.approved_by.username if req.approved_by else '',
                req.requested_quantity,
                req.current_quantity,
                req.get_status_display(),
                req.supplier or '',
                req.estimated_cost or '',
                req.notes or '',
                req.completed_at.strftime('%Y-%m-%d %H:%M:%S') if req.completed_at else ''
            ]

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'restock_requests_export_{timestamp}.csv'
    return stream_csv(get_rows(), filename)
