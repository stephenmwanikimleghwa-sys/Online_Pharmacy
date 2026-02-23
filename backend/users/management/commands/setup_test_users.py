from django.core.management.base import BaseCommand
from users.models import User, RoleChoices

class Command(BaseCommand):
    help = 'Setup test users with specific roles and passwords'

    def handle(self, *args, **options):
        users_to_create = [
            {'username': 'mwaniki', 'password': 'changeme', 'role': RoleChoices.ADMIN, 'email': 'mwaniki@example.com'},
            {'username': 'salim', 'password': 'potua', 'role': RoleChoices.PHARMACIST, 'email': 'potua@gmail.com'},
            {'username': 'difence', 'password': 'mlegwa', 'role': RoleChoices.ADMIN, 'email': 'difence@gmail.com'},
            {'username': 'blessing', 'password': 'kijala', 'role': RoleChoices.AUDITOR, 'email': 'blessing@example.com'},
            {'username': 'agnes', 'password': 'caroo', 'role': RoleChoices.CASHIER, 'email': 'agnes@example.com'},
        ]

        for user_data in users_to_create:
            user, created = User.objects.get_or_create(username=user_data['username'])
            user.set_password(user_data['password'])
            user.role = user_data['role']
            user.email = user_data['email']
            user.must_change_password = True  # Force change on first login
            user.is_staff = (user_data['role'] == RoleChoices.ADMIN)
            user.is_superuser = (user_data['role'] == RoleChoices.ADMIN)
            user.save()
            
            status = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{status} user: {user.username} with role: {user.role}"))
