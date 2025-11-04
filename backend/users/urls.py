from django.urls import path
# Import views from the views package submodules to avoid name collision
from .views.core_views import (
    UserLoginView,
    UserProfileView,
    ChangePasswordView,
    admin_user_list,
    verify_pharmacist,
    profile,
)
from .views.admin_views import (
    list_pharmacists,
    delete_pharmacist,
    admin_create_user,
    delete_user,
    update_user,
)

app_name = "users"

urlpatterns = [
    path("login/", UserLoginView.as_view(), name="login"),
    # Profile management
    # Simple function-based profile endpoint returns the authenticated user's data
    path("profile/", profile, name="profile"),
    path(
        "change-password/", ChangePasswordView.as_view(), name="change_password"
    ),
    # Admin endpoints
    path("admin/users/", admin_user_list, name="admin_user_list"),
    path(
        "admin/verify-pharmacist/<int:user_id>/",
        verify_pharmacist,
        name="verify_pharmacist",
    ),
    # Admin pharmacist management
    path(
        "admin/pharmacists/create/",
        admin_create_user,
        name="admin_create_pharmacist",
    ),
    path(
        "admin/pharmacists/",
        list_pharmacists,
        name="admin_list_pharmacists",
    ),
    path(
        "admin/pharmacists/<int:user_id>/delete/",
        delete_pharmacist,
        name="admin_delete_pharmacist",
    ),
    # Generic admin user management
    path(
        "admin/users/create/",
        admin_create_user,
        name="admin_create_user",
    ),
    path(
        "admin/users/<int:user_id>/delete/",
        delete_user,
        name="admin_delete_user",
    ),
    path(
        "admin/users/<int:user_id>/",
        update_user,
        name="admin_update_user",
    ),
]
