import csv
from datetime import datetime
from django.http import HttpResponse, StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsPharmacistOrAdmin
from products.models import Product, StockLog
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
    # Get query parameters for filtering
    category = request.GET.get('category')
    low_stock = request.GET.get('low_stock') == 'true'
    out_of_stock = request.GET.get('out_of_stock') == 'true'

    # Base queryset
    products = Product.objects.filter(is_active=True)

    # Apply filters
    if category:
        products = products.filter(category=category)
    if low_stock:
        products = products.filter(
            stock_quantity__lte=models.F('reorder_threshold'),
            stock_quantity__gt=0
        )
    if out_of_stock:
        products = products.filter(stock_quantity=0)

    # Prepare CSV headers and rows
    headers = [
        'ID', 'Name', 'Category', 'Supplier', 'Stock Quantity',
        'Reorder Threshold', 'Price', 'Last Updated', 'Status'
    ]
    
    def get_rows():
        yield headers
        for product in products:
            status = 'Out of Stock' if product.stock_quantity == 0 else (
                'Low Stock' if product.stock_quantity <= product.reorder_threshold else 'In Stock'
            )
            yield [
                product.id,
                product.name,
                product.category,
                product.supplier or '',
                product.stock_quantity,
                product.reorder_threshold,
                product.price,
                product.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
                status
            ]

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'inventory_export_{timestamp}.csv'
    return stream_csv(get_rows(), filename)

@api_view(['GET'])
@permission_classes([IsPharmacistOrAdmin])
def export_stock_logs(request):
    """Export stock logs to CSV."""
    # Get query parameters for filtering
    product_id = request.GET.get('product_id')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    change_type = request.GET.get('change_type')

    # Base queryset with related fields
    logs = StockLog.objects.select_related('product', 'logged_by').order_by('-timestamp')

    # Apply filters
    if product_id:
        logs = logs.filter(product_id=product_id)
    if start_date:
        logs = logs.filter(timestamp__gte=start_date)
    if end_date:
        logs = logs.filter(timestamp__lte=end_date)
    if change_type:
        logs = logs.filter(change_type=change_type)

    # Prepare CSV headers and rows
    headers = [
        'ID', 'Timestamp', 'Product', 'Previous Quantity', 'New Quantity',
        'Change Amount', 'Change Type', 'Reason', 'Logged By'
    ]
    
    def get_rows():
        yield headers
        for log in logs:
            yield [
                log.id,
                log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                log.product.name,
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
    # Get query parameters for filtering
    status = request.GET.get('status')
    product_id = request.GET.get('product_id')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    # Base queryset with related fields
    requests = RestockRequest.objects.select_related(
        'product', 'requested_by', 'approved_by'
    ).order_by('-created_at')

    # Apply filters
    if status:
        requests = requests.filter(status=status)
    if product_id:
        requests = requests.filter(product_id=product_id)
    if start_date:
        requests = requests.filter(created_at__gte=start_date)
    if end_date:
        requests = requests.filter(created_at__lte=end_date)

    # Prepare CSV headers and rows
    headers = [
        'ID', 'Created At', 'Product', 'Requested By', 'Approved By',
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