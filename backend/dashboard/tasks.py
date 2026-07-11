from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from users.models import User, RoleChoices
from dashboard.services import build_global_overview
import logging

logger = logging.getLogger(__name__)

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_end_of_day_sales_summary(self):
    """
    Sends an end of day summary to all pharmacy owners/admins.
    Uses the dashboard global overview service.
    """
    try:
        # Get recipients (Admins/Owners)
        recipients = User.objects.filter(
            role=RoleChoices.ADMIN,
            is_active=True,
            email__isnull=False
        ).exclude(email="").values_list("email", flat=True)
        
        if not recipients:
            logger.warning("No admin emails found to send EOD summary.")
            return

        # Fetch global overview for today
        # We need an admin user object to pass to the service
        admin_user = User.objects.filter(role=RoleChoices.ADMIN).first()
        if not admin_user:
            return
            
        overview = build_global_overview(admin_user)
        
        # Build message
        subject = "Daily Pharmacy Sales Summary"
        message = "End of Day Pharmacy Sales Summary\n================================\n\n"
        
        message += f"Total Global Sales (Today): {overview.get('total_sales_today', 0)}\n"
        message += f"Total Global Revenue (Today): KES {overview.get('total_revenue_today', 0)}\n\n"
        
        message += "Breakdown by Branch:\n"
        for branch in overview.get('branches', []):
            message += f"- {branch['branch_name']}: {branch['total_sales_today']} sales, KES {branch['total_revenue_today']}\n"
            
        message += "\nGreat work today! Log in to the dashboard for more details.\n"

        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER or 'noreply@pharmacy.local',
            list(recipients),
            fail_silently=False
        )
        logger.info(f"EOD Sales summary sent successfully to {len(recipients)} admins.")
        
    except Exception as exc:
        logger.error(f"Failed to send EOD summary, retrying... ({exc})")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
