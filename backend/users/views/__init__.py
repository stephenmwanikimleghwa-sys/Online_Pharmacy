from .admin_views import (
    admin_create_user,
    list_pharmacists,
    delete_pharmacist,
    delete_user,
    update_user,
)
from .core_views import (
    UserLoginView,
    UserProfileView,
    ChangePasswordView,
    admin_user_list,
    verify_pharmacist,
    profile,
)

__all__ = [
    'admin_create_user',
    'list_pharmacists',
    'delete_pharmacist',
    'delete_user',
    'update_user',
    'UserLoginView',
    'UserProfileView',
    'ChangePasswordView',
    'admin_user_list',
    'verify_pharmacist',
    'profile',
]