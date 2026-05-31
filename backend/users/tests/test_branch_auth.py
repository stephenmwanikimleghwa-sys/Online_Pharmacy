from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import Branch, Pharmacy, RoleChoices

User = get_user_model()


class BranchAuthTests(APITestCase):
    def setUp(self):
        self.pharmacy = Pharmacy.objects.create(
            name="Transcounty",
            address="Nairobi",
            contact_phone="0700000000",
            license_number="LIC-001",
        )
        self.main = Branch.objects.create(
            pharmacy=self.pharmacy,
            name="TRANSCOUNTY_MAIN",
            address="Main St",
            contact_phone="0700000001",
            is_headquarters=True,
        )
        self.annex = Branch.objects.create(
            pharmacy=self.pharmacy,
            name="TRANSCOUNTY_ANNEX",
            address="Annex St",
            contact_phone="0700000002",
        )
        self.peak = Branch.objects.create(
            pharmacy=self.pharmacy,
            name="PEAKFARM",
            address="Farm Rd",
            contact_phone="0700000003",
            branch_type="AGROVET",
        )
        self.admin = User.objects.create_user(
            username="judy",
            password="password123",
            role=RoleChoices.ADMIN,
            pharmacy=self.pharmacy,
            branch=self.main,
        )
        self.pharmacist = User.objects.create_user(
            username="hellen",
            password="password123",
            role=RoleChoices.PHARMACIST,
            pharmacy=self.pharmacy,
            branch=self.annex,
        )

    def test_admin_login_requires_branch_selection(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "judy", "password": "password123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["requires_branch_selection"])
        self.assertIsNone(response.data["active_branch"])
        self.assertEqual(len(response.data["allowed_branches"]), 3)
        self.assertIn("tokens", response.data)
        self.assertEqual(response.data["user"]["username"], "judy")
        self.assertEqual(response.data["user"]["home_branch"]["name"], "TRANSCOUNTY_MAIN")

    def test_pharmacist_login_sets_active_branch(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "hellen", "password": "password123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["requires_branch_selection"])
        self.assertEqual(response.data["active_branch"]["name"], "TRANSCOUNTY_ANNEX")

    def test_switch_branch_issues_new_tokens(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/auth/switch-branch/",
            {"branch_id": self.peak.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["active_branch"]["name"], "PEAKFARM")
        self.assertIn("access", response.data["tokens"])

    def test_switch_branch_denied_for_other_pharmacy_branch(self):
        other_pharmacy = Pharmacy.objects.create(
            name="Other",
            address="Elsewhere",
            contact_phone="0700000099",
            license_number="LIC-OTHER",
        )
        other_branch = Branch.objects.create(
            pharmacy=other_pharmacy,
            name="OTHER_BRANCH",
            address="X",
            contact_phone="0700000098",
        )
        self.client.force_authenticate(user=self.pharmacist)
        response = self.client.post(
            "/api/auth/switch-branch/",
            {"branch_id": other_branch.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
