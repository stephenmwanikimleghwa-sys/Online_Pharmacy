# from django.urls import path
# from . import views
# from .views import AdminPharmacistCreate, AdminUserCreate, list_pharmacists, delete_pharmacist
# 
# app_name = "users"
# 
# urlpatterns = [
#     path("login/", views.UserLoginView.as_view(), name="login"),
#     # Profile management
#     # Simple function-based profile endpoint returns the authenticated user's data
#     path("profile/", views.profile, name="profile"),
#     path(
#         "change-password/", views.ChangePasswordView.as_view(), name="change_password"
#     ),
#     # Admin endpoints
#     path("admin/users/", views.admin_user_list, name="admin_user_list"),
#     path(
#         "admin/verify-pharmacist/<int:user_id>/",
#         views.verify_pharmacist,
#         name="verify_pharmacist",
#     ),
#     # Admin pharmacist management
#     path(
#         "admin/pharmacists/create/",
#         AdminPharmacistCreate.as_view(),
#         name="admin_create_pharmacist",
#     ),
#     # Admin create user (admin or pharmacist)
#     path(
#         "admin/users/create/",
#         AdminUserCreate.as_view(),
#         name="admin_create_user",
#     ),
#     path(
#         "admin/pharmacists/",
#         list_pharmacists,
#         name="admin_list_pharmacists",
#     ),
#     path(
#         "admin/pharmacists/<int:user_id>/delete/",
#         delete_pharmacist,
#         name="admin_delete_pharmacist",
#     ),
#     # Admin user detail (view/update/delete)
#     path(
#         "admin/users/<int:user_id>/",
#         views.admin_user_detail,
#         name="admin_user_detail",
#     ),
# ]
