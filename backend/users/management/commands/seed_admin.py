from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from users.models import RoleChoices


class Command(BaseCommand):
    help = "Seed admin user. Usage: python manage.py seed_admin --username <username> --password <password> --email <email>"

    def add_arguments(self, parser):
        parser.add_argument("--username", type=str, default="mwaniki")
        parser.add_argument("--password", type=str, default="changeme")
        parser.add_argument("--email", type=str, default="mwaniki@example.com")

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"]
        password = options["password"]
        email = options["email"]

        # Delete existing admin users except the one we're about to create/update
        existing_admins = User.objects.filter(role=RoleChoices.ADMIN).exclude(username=username)
        deleted_count = existing_admins.count()
        if deleted_count:
            existing_admins.delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted_count} existing admin user(s)."))

        user, created = User.objects.update_or_create(username=username, defaults={"email": email})
        user.set_password(password)
        user.role = RoleChoices.ADMIN
        # Ensure Django admin permissions are set so DRF's IsAdminUser recognizes the account
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created admin user '{username}'"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated admin user '{username}'"))

        self.stdout.write(self.style.SUCCESS("seed_admin completed."))
