from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.pharmacy import PharmacyViewSet
from .views.document_views import PharmacyDocumentViewSet
from .views.activity import StaffActivityLogViewSet
from .views.customers import CustomerViewSet

# Import views from the views package submodules to avoid name collision
from .views.core_views import (
    UserLoginView,
    UserProfileView,
    ChangePasswordView,
    LogoutView,
    admin_user_list,
    verify_pharmacist,
    profile,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)
from .views.branch_auth_views import SwitchBranchView
from .views.admin_views import (
    list_pharmacists,
    delete_pharmacist,
    admin_create_user,
    delete_user,
    deactivate_user,
    admin_reset_password,
    update_user,
)
from .views.branches import (
    BranchListCreateView,
    BranchDetailView,
    branch_summary,
    all_branches_summary,
)

app_name = "users"

router = DefaultRouter()
router.register(r'pharmacies', PharmacyViewSet, basename='pharmacy')
router.register(r'documents', PharmacyDocumentViewSet, basename='document')
router.register(r'activity-logs', StaffActivityLogViewSet, basename='activity-log')
router.register(r'customers', CustomerViewSet, basename='customer')

urlpatterns = [
    path('', include(router.urls)),
    path("login/", UserLoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("switch-branch/", SwitchBranchView.as_view(), name="switch_branch"),
    # Profile management
    # Simple function-based profile endpoint returns the authenticated user's data
    path("profile/", profile, name="profile"),
    path(
        "change-password/", ChangePasswordView.as_view(), name="change_password"
    ),
    path(
        "password-reset/", PasswordResetRequestView.as_view(), name="password_reset"
    ),
    path(
        "password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"
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
        "admin/users/<int:user_id>/deactivate/",
        deactivate_user,
        name="admin_deactivate_user",
    ),
    path(
        "admin/users/<int:user_id>/reset-password/",
        admin_reset_password,
        name="admin_reset_password",
    ),
    path(
        "admin/users/<int:user_id>/",
        update_user,
        name="admin_update_user",
    ),
    # Branch management
    path('branches/', BranchListCreateView.as_view(), name='branch_list_create'),
    path('branches/summary/', all_branches_summary, name='all_branches_summary'),
    path('branches/<int:pk>/', BranchDetailView.as_view(), name='branch_detail'),
    path('branches/<int:pk>/summary/', branch_summary, name='branch_summary'),
]
