from celery import shared_task
from django.core.mail import send_mail
import logging

logger = logging.getLogger(__name__)

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,  # Retry after 60s
    rate_limit='10/s'        # Throttle to avoid email provider caps
)
def send_async_email(self, subject, message, from_email, recipient_list, html_message=None):
    """
    Sends an email asynchronously with exponential backoff on failures.
    """
    try:
        send_mail(
            subject,
            message,
            from_email,
            recipient_list,
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"Async email sent successfully to {recipient_list}")
    except Exception as exc:
        logger.warning(f"Failed to send async email to {recipient_list}, retrying... ({exc})")
        # Exponential backoff: 60s, 120s, 240s
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
