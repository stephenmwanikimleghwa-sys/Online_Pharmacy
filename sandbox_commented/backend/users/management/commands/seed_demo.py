# from django.core.management.base import BaseCommand
# from django.contrib.auth import get_user_model
# from products.models import Product
# from users.models import RoleChoices
# 
# 
# class Command(BaseCommand):
#     help = (
#         "Seed demo data: admin and pharmacist users and a sample product. "
#         "Safe: will update-or-create and will not delete other users/products."
#     )
# 
#     def add_arguments(self, parser):
#         parser.add_argument("--admin-username", type=str, default="mwaniki")
#         parser.add_argument("--admin-password", type=str, default="Nyashinski@254")
#         parser.add_argument("--admin-email", type=str, default="mwaniki@example.com")
#         parser.add_argument("--pharmacist-username", type=str, default="hellen")
#         parser.add_argument("--pharmacist-password", type=str, default="PharmPass123")
#         # By default we do NOT seed pharmacist accounts. Admins should create pharmacists.
#         parser.add_argument(
#             "--seed-pharmacist",
#             action="store_true",
#             help="If set, also create a demo pharmacist account (disabled by default).",
#         )
#         parser.add_argument("--product-name", type=str, default="Paracetamol 500mg")
# 
#     def handle(self, *args, **options):
#         User = get_user_model()
# 
#         admin_username = options["admin_username"]
#         admin_password = options["admin_password"]
#         admin_email = options["admin_email"]
# 
#         product_name = options["product_name"]
# 
#         # Create/update admin
#         admin, created = User.objects.update_or_create(
#             username=admin_username, defaults={"email": admin_email}
#         )
#         admin.set_password(admin_password)
#         admin.role = RoleChoices.ADMIN
#         admin.is_staff = True
#         admin.is_superuser = True
#         admin.is_active = True
#         admin.save()
#         self.stdout.write(self.style.SUCCESS(f"Admin '{admin_username}' created/updated."))
# 
#         # Optionally create/update pharmacist (disabled by default)
#         if options.get("seed_pharmacist"):
#             pharmacist_username = options["pharmacist_username"]
#             pharmacist_password = options["pharmacist_password"]
#             pharmacist, created = User.objects.update_or_create(
#                 username=pharmacist_username,
#                 defaults={
#                     "email": f"{pharmacist_username}@example.com",
#                     "role": RoleChoices.PHARMACIST,
#                     "is_active": True,
#                 }
#             )
#             pharmacist.set_password(pharmacist_password)
#             pharmacist.save()
#             self.stdout.write(self.style.SUCCESS(f"Pharmacist '{pharmacist_username}' created/updated."))
#         else:
#             self.stdout.write(self.style.WARNING("Skipping pharmacist seeding (admins should create pharmacists)."))
# 
#         # Create sample product if products app exists
#         try:
#             product, prod_created = Product.objects.get_or_create(
#                 name=product_name,
#                 defaults={
#                     "description": "Paracetamol 500mg tablets",
#                     "category": "general",
#                     "price": 50.00,
#                     "stock_quantity": 100,
#                 },
#             )
#             if prod_created:
#                 self.stdout.write(self.style.SUCCESS(f"Product '{product_name}' created."))
#             else:
#                 self.stdout.write(self.style.WARNING(f"Product '{product_name}' already exists."))
#         except Exception as e:
#             self.stdout.write(self.style.WARNING(f"Could not create product: {e}"))
# 
#         self.stdout.write(self.style.SUCCESS("seed_demo completed."))
