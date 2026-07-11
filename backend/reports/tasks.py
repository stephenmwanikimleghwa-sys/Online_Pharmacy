from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.db.models import F
from users.models import User, RoleChoices
from products.models import BranchStock
from inventory.services.expiry import get_expiry_batches
import logging

logger = logging.getLogger(__name__)

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_daily_stock_and_expiry_digest(self):
    """
    Sends a daily digest email of low stock items and expiring batches
    to all branch managers and admins.
    """
    try:
        # Get recipients (Admins and Branch Managers)
        # Note: Depending on your exact roles, you might include PHARMACIST or specifically MANAGER
        recipients = User.objects.filter(
            role__in=[RoleChoices.ADMIN],
            is_active=True,
            email__isnull=False
        ).exclude(email="").values_list("email", flat=True)
        
        if not recipients:
            logger.warning("No admin emails found to send daily digest.")
            return

        # Fetch Low Stock
        low_stock_qs = BranchStock.objects.filter(
            product__is_active=True,
            quantity__lte=F('reorder_level'),
            quantity__gt=0
        ).select_related('product', 'branch')
        
        low_stock_alerts = [
            {
                "product": item.product.name,
                "branch": item.branch.name if item.branch else "Main",
                "quantity": item.quantity,
                "threshold": item.reorder_level
            }
            for item in low_stock_qs
        ]

        # Fetch Expiry (90 days)
        expiring_batches = get_expiry_batches(
            branch_id=None,
            status_filter='ALL',
            window_days=90,
        )
        
        if not low_stock_alerts and not expiring_batches:
            logger.info("No low stock or expiring items. Skipping digest.")
            return

        subject = "Daily Pharmacy Digest: Action Required (Low Stock & Expiry)"
        
        # Build a simple text message (or you can use HTML template)
        message = "Daily Pharmacy Digest\n====================\n\n"
        
        if low_stock_alerts:
            message += "LOW STOCK ALERTS:\n"
            for alert in low_stock_alerts:
                message += f"- {alert['product']} ({alert['branch']}): {alert['quantity']} remaining (Threshold: {alert['threshold']})\n"
            message += "\n"
            
        if expiring_batches:
            message += "EXPIRING SOON (Next 90 Days):\n"
            for batch in expiring_batches:
                message += f"- {batch['product_name']} ({batch['branch_name']}): Batch {batch['batch_number']} expires on {batch['expiry_date']} ({batch['quantity_remaining']} remaining)\n"
            message += "\n"

        message += "Please log in to the dashboard to take action.\n"

        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER or 'noreply@pharmacy.local',
            list(recipients),
            fail_silently=False
        )
        logger.info(f"Daily digest sent successfully to {len(recipients)} admins.")
        
    except Exception as exc:
        logger.warning(f"Failed to send daily digest, retrying... ({exc})")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
