# from django.test import TestCase
# from django.core.management import call_command
# from rest_framework.test import APIClient
# 
# from users.models import RoleChoices, User
# 
# 
# class SeedAndLoginTest(TestCase):
#     def test_seed_admin_and_login(self):
#         # Run the management command to seed the admin user
#         call_command("seed_admin", username="mwaniki", password="changeme", email="mwaniki@example.com")
# 
#         # Ensure the admin user exists and has the correct role/flags
#         user = User.objects.get(username="mwaniki")
#         self.assertEqual(user.role, RoleChoices.ADMIN)
#         self.assertTrue(user.is_staff)
#         self.assertTrue(user.is_superuser)
# 
#         # Use DRF APIClient to POST to the login endpoint
#         client = APIClient()
#         resp = client.post("/api/auth/login/", {"username": "mwaniki", "password": "changeme"}, format="json")
#         self.assertEqual(resp.status_code, 200, msg=f"Login failed: {resp.data}")
#         # Response expected to include JWT tokens and user data
#         self.assertIn("access", resp.data)
#         self.assertIn("refresh", resp.data)
#         self.assertIn("user", resp.data)
#         self.assertEqual(resp.data["user"]["username"], "mwaniki")
