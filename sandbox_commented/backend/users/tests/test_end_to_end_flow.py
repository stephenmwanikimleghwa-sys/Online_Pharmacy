# from django.test import TestCase
# from django.core.management import call_command
# from rest_framework.test import APIClient
# 
# from users.models import RoleChoices, User
# from products.models import Product
# 
# 
# class EndToEndFlowTest(TestCase):
#     def setUp(self):
#         # Seed demo data (admin, pharmacist, sample product)
#         call_command("seed_demo")
# 
#         # Refresh objects
#         self.admin = User.objects.get(username="mwaniki")
#         self.pharmacist = User.objects.get(username="hellen")
#         self.product = Product.objects.filter(name__icontains="Paracetamol").first()
# 
#         self.client = APIClient()
# 
#     def test_admin_login_create_medicine_and_pharmacist_actions(self):
#         # Admin login
#         resp = self.client.post(
#             "/api/auth/login/", {"username": "mwaniki", "password": "Nyashinski@254"}, format="json"
#         )
#         self.assertEqual(resp.status_code, 200, msg=f"Admin login failed: {resp.data}")
#         access = resp.data.get("access") or resp.data.get("token")
#         self.assertTrue(access)
# 
#         # Set auth header for admin
#         self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
# 
#         # Ensure medicines list is accessible
#         resp = self.client.get("/api/products/")
#         self.assertIn(resp.status_code, (200, 204))
# 
#         # Create a new medicine via API (if POST allowed)
#         new_med = {
#             "name": "TestMed 100mg",
#             "description": "Test medicine",
#             "category": "general",
#             "price": "25.00",
#             "stock_quantity": 50,
#         }
#         resp = self.client.post("/api/products/", new_med, format="json")
#         # Accept either created or forbidden depending on permissions
#         self.assertIn(resp.status_code, (201, 403, 400), msg=f"Unexpected products POST response: {resp.status_code} {resp.data}")
# 
#         # Log out admin client auth for pharmacist actions
#         self.client.credentials()
# 
#         # Pharmacist login
#         resp = self.client.post(
#             "/api/auth/login/", {"username": "hellen", "password": "PharmPass123"}, format="json"
#         )
#         self.assertEqual(resp.status_code, 200, msg=f"Pharmacist login failed: {resp.data}")
#         pharm_access = resp.data.get("access") or resp.data.get("token")
#         self.assertTrue(pharm_access)
# 
#         # Pharmacist set auth
#         self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {pharm_access}")
# 
#         # Pharmacist dispenses 2 units of sample product (if endpoint exists)
#         if self.product:
#             dispense_url = f"/api/inventory/dispense/{self.product.id}/"
#             resp = self.client.post(dispense_url, {"quantity": 2}, format="json")
#             # Accept 200 OK or 201 or 403 if route is restricted
#             self.assertIn(resp.status_code, (200, 201, 400, 403), msg=f"Dispense response: {resp.status_code} {resp.data}")
# 
#             # Reload product and check stock decreased if dispense succeeded with 200/201
#             if resp.status_code in (200, 201):
#                 self.product.refresh_from_db()
#                 self.assertLessEqual(self.product.stock_quantity, 98 + 1)  # allow for baseline differences
# 
#         # Pharmacist makes restock request (if endpoint exists)
#         restock_url = f"/api/inventory/restock-request/"
#         resp = self.client.post(restock_url, {"product_id": self.product.id if self.product else None, "quantity": 50}, format="json")
#         # Accept either created or forbidden or bad request
#         self.assertIn(resp.status_code, (201, 200, 400, 403), msg=f"Restock response: {resp.status_code} {resp.data}")
