from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import Branch, Pharmacy, RoleChoices

User = get_user_model()


class DashboardViewsTests(APITestCase):
    def setUp(self):
        self.pharmacy = Pharmacy.objects.create(
            name="Transcounty",
            address="Nairobi",
            contact_phone="0700000000",
            license_number="LIC-DASH",
        )
        self.branch = Branch.objects.create(
            pharmacy=self.pharmacy,
            name="TRANSCOUNTY_MAIN",
            address="Main",
            contact_phone="0700000001",
            is_headquarters=True,
        )
        self.admin = User.objects.create_user(
            username="admin_dash",
            password="pass123",
            role=RoleChoices.ADMIN,
            pharmacy=self.pharmacy,
            branch=self.branch,
        )
        self.pharmacist = User.objects.create_user(
            username="pharm_dash",
            password="pass123",
            role=RoleChoices.PHARMACIST,
            pharmacy=self.pharmacy,
            branch=self.branch,
        )

    def test_global_overview_admin_only(self):
        self.client.force_authenticate(user=self.pharmacist)
        response = self.client.get("/api/dashboard/global-overview/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/dashboard/global-overview/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("branches", response.data)
        self.assertIn("totals", response.data)

    def test_branch_operations_requires_active_branch(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/dashboard/branch-operations/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
