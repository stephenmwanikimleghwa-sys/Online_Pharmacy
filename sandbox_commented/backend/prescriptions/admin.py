# from django.contrib import admin
# from .models import Prescription
# 
# 
# @admin.register(Prescription)
# class PrescriptionAdmin(admin.ModelAdmin):
#     list_display = (
#         "id",
#         "user",
#         "status",
#         "verified_by",
#         "uploaded_at",
#         "verified_at",
#     )
#     list_filter = (
#         "status",
#         "uploaded_at",
#         "verified_by",
#     )
#     search_fields = (
#         "user__username",
#         "user__email",
#         "notes",
#     )
#     readonly_fields = (
#         "uploaded_at",
#         "verified_at",
#     )
#     date_hierarchy = "uploaded_at"
#     ordering = ("-uploaded_at",)
# 
#     fieldsets = (
#         (
#             "Basic Information",
#             {
#                 "fields": (
#                     "user",
#                     "file_path",
#                     "notes",
#                 ),
#             },
#         ),
#         (
#             "Status",
#             {
#                 "fields": (
#                     "status",
#                     "verified_by",
#                     "verified_at",
#                 ),
#                 "classes": ("collapse",),
#             },
#         ),
#     )
# 
#     def get_readonly_fields(self, request, obj=None):
#         if obj:  # Editing an existing prescription
#             return self.readonly_fields + ("user", "file_path")
#         return self.readonly_fields
