from django.urls import path
from . import views

app_name = "users"

urlpatterns = [
    path("register/", views.UserRegistrationView.as_view(), name="register"),
    path("login/", views.UserLoginView.as_view(), name="login"),
    path(
        "pharmacist-register/",
        views.PharmacistRegistrationView.as_view(),
        name="pharmacist_register",
    ),
    path("login/", views.UserLoginView.as_view(), name="login"),
    # Profile management
    # Simple function-based profile endpoint returns the authenticated user's data
    path("profile/", views.profile, name="profile"),
    path(
        "change-password/", views.ChangePasswordView.as_view(), name="change_password"
    ),
    # Admin endpoints
    path("admin/users/", views.admin_user_list, name="admin_user_list"),
    path(
        "admin/verify-pharmacist/<int:user_id>/",
        views.verify_pharmacist,
        name="verify_pharmacist",
    ),
]
