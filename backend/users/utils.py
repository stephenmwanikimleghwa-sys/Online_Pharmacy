import logging
from decimal import Decimal

from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction

from .models import StaffActivityLog

logger = logging.getLogger(__name__)

def sanitize_log_input(user_input) -> str:
    """Sanitize external inputs before logging to prevent log injection (CRLF)."""
    if not isinstance(user_input, str):
        user_input = str(user_input)
    return user_input.replace('\n', '\\n').replace('\r', '\\r')


def _json_safe(value):
    """Coerce a value into something JSONField can store.

    Callers pass model field values straight through, and several of those are
    DecimalField (e.g. BranchStock.quantity), which json cannot encode. Decimals
    become int when integral and float otherwise; dates/UUIDs and friends go
    through DjangoJSONEncoder. Anything still unencodable falls back to str so
    that logging never breaks the operation being logged.
    """
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    try:
        DjangoJSONEncoder().encode(value)
    except TypeError:
        return str(value)
    return value


def log_activity(user, event_type, branch=None, ip_address=None, details_dict=None):
    """
    Utility function to log staff activity.

    Args:
        user: The User instance performing the action.
        event_type (str): The type of event (e.g., 'LOGIN', 'SALE_MADE').
        branch: The Branch instance where the action occurred (optional).
        ip_address (str): The IP address of the request (optional).
        details_dict (dict): Additional event-specific details (optional).

    Activity logging is best-effort: it must never fail the operation it is
    recording.
    """
    if not details_dict:
        details_dict = {}

    try:
        # Wrap in a savepoint. Without one, a failed INSERT marks the calling
        # atomic block as needing rollback, so catching the error here was not
        # enough — the caller's next query raised TransactionManagementError and
        # the request 500'd anyway. The savepoint confines the damage to this
        # insert.
        with transaction.atomic():
            StaffActivityLog.objects.create(
                user=user,
                event_type=event_type,
                branch=branch,
                ip_address=ip_address,
                details=_json_safe(details_dict)
            )
    except Exception as e:
        safe_username = sanitize_log_input(user.username if user else "Unknown")
        safe_error = sanitize_log_input(str(e))
        logger.error(f"Failed to log activity '{event_type}' for user '{safe_username}': {safe_error}")
