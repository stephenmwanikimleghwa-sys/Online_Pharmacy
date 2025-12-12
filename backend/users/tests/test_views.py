from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class UserAuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='password123',
            role='pharmacist'
        )
        self.login_url = reverse('login') # Assuming URL name is 'login' - need to verify
        self.profile_url = reverse('profile') # Assuming URL name is 'profile'

    def test_login_success(self):
        """Test successful login returns tokens."""
        data = {
            "username": "testuser",
            "password": "password123"
        }
        response = self.client.post('/api/auth/login/', data) # Using direct path if reverse fails
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_failure(self):
        """Test login with incorrect credentials."""
        data = {
            "username": "testuser",
            "password": "wrongpassword"
        }
        response = self.client.post('/api/auth/login/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) # Or 401 depending on implementation

    def test_get_profile_authenticated(self):
        """Test retrieving profile for authenticated user."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')

    def test_get_profile_unauthenticated(self):
        """Test retrieving profile without authentication fails."""
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile(self):
        """Test updating user profile."""
        self.client.force_authenticate(user=self.user)
        data = {"first_name": "Updated Name"}
        response = self.client.patch('/api/auth/profile/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Updated Name")
