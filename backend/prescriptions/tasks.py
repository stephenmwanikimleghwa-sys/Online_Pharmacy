from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from users.models import User, RoleChoices
from .models import Prescription
import structlog
from users.utils import sanitize_log_input

logger = structlog.get_logger(__name__)

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def notify_pharmacist_new_prescription(self, prescription_id):
    """
    Sends an email notification to all pharmacists and admins
    when a new prescription is uploaded by a patient.
    """
    try:
        prescription = Prescription.objects.get(id=prescription_id)
        
        # Get emails of all active pharmacists and admins
        recipients = User.objects.filter(
            role__in=[RoleChoices.PHARMACIST, RoleChoices.ADMIN],
            is_active=True,
            email__isnull=False
        ).exclude(email="").values_list("email", flat=True)
        
        if not recipients:
            logger.warning("no_pharmacist_emails_found", prescription_id=prescription_id)
            return
            
        patient_info = prescription.get_patient_info()
        patient_name = patient_info.get("name") or "A patient"
        
        subject = f"New Prescription Uploaded: {patient_name}"
        message = (
            f"Hello,\n\n"
            f"A new prescription has been uploaded by {patient_name} and is waiting in the Pending queue.\n"
            f"Please log in to the pharmacy dashboard to verify it.\n\n"
            f"Prescription ID: {prescription_id}\n"
            f"Uploaded At: {prescription.uploaded_at.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            f"Thank you,\nPharmacy Aggregator System"
        )
        
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER or 'noreply@pharmacy.local',
            list(recipients),
            fail_silently=False
        )
        logger.info("prescription_notification_sent", prescription_id=prescription_id, recipient_count=len(recipients))
        
    except Prescription.DoesNotExist:
        logger.error("prescription_not_found_for_notification", prescription_id=prescription_id)
    except Exception as exc:
        safe_exc = sanitize_log_input(str(exc))
        logger.warning("prescription_notification_failed_retrying", error=safe_exc)
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
