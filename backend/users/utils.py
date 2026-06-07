import logging
from .models import StaffActivityLog

logger = logging.getLogger(__name__)

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
        logger.error(f"Failed to log activity '{event_type}' for user '{user.username}': {str(e)}")
