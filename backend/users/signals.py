from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from .models import StaffActivityLog
from .utils import log_activity

@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')

    log_activity(
        user=user,
        event_type='LOGIN',
        ip_address=ip_address
    )

@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')

    if user:
        log_activity(
            user=user,
            event_type='LOGOUT',
            ip_address=ip_address
        )
