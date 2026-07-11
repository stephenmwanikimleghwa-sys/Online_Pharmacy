import logging
from .models import StaffActivityLog

logger = logging.getLogger(__name__)

def sanitize_log_input(user_input) -> str:
    """Sanitize external inputs before logging to prevent log injection (CRLF)."""
    if not isinstance(user_input, str):
        user_input = str(user_input)
    return user_input.replace('\n', '\\n').replace('\r', '\\r')

def log_activity(user, event_type, branch=None, ip_address=None, details_dict=None):
    """
    Utility function to log staff activity.
    
    Args:
        user: The User instance performing the action.
        event_type (str): The type of event (e.g., 'LOGIN', 'SALE_MADE').
        branch: The Branch instance where the action occurred (optional).
        ip_address (str): The IP address of the request (optional).
        details_dict (dict): Additional event-specific details (optional).
    """
    if not details_dict:
        details_dict = {}
        
    try:
        StaffActivityLog.objects.create(
            user=user,
            event_type=event_type,
            branch=branch,
            ip_address=ip_address,
            details=details_dict
        )
    except Exception as e:
        safe_username = sanitize_log_input(user.username if user else "Unknown")
        safe_error = sanitize_log_input(str(e))
        logger.error(f"Failed to log activity '{event_type}' for user '{safe_username}': {safe_error}")
