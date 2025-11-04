# from django.contrib import admin
# from .models import Payment
# 
# 
# @admin.register(Payment)
# class PaymentAdmin(admin.ModelAdmin):
#     list_display = (
#         "id",
#         "order",
#         "method",
#         "amount",
#         "status",
#         "reference",
#         "created_at",
#     )
#     list_filter = (
#         "method",
#         "status",
#         "created_at",
#     )
#     search_fields = (
#         "reference",
#         "order__id",
#         "method",
#     )
#     readonly_fields = (
#         "created_at",
#         "updated_at",
#     )
#     date_hierarchy = "created_at"
#     ordering = ("-created_at",)
# 
#     fieldsets = (
#         (
#             "Payment Information",
#             {
#                 "fields": (
#                     "order",
#                     "method",
#                     "amount",
#                     "status",
#                     "reference",
#                     "transaction_id",
#                     "transaction_date",
#                     "notes",
#                 ),
#             },
#         ),
#         (
#             "Timestamps",
#             {
#                 "fields": ("created_at", "updated_at"),
#                 "classes": ("collapse",),
#             },
#         ),
#     )
# 
#     def get_readonly_fields(self, request, obj=None):
#         if obj:  # Editing an existing payment
#             return self.readonly_fields + ("order", "method", "amount")
#         return self.readonly_fields
