import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from users.models import User, RoleChoices

def create_user(username, role, password):
    user, created = User.objects.get_or_create(username=username)
    user.role = role
    user.set_password(password)
    user.is_verified = True
    user.save()
    if created:
        print(f"Created {role} user: {username}")
    else:
        print(f"Updated {role} user: {username}")
    return user

if __name__ == "__main__":
    create_user("admin", RoleChoices.ADMIN, "admin123")
    create_user("pharmacist", RoleChoices.PHARMACIST, "pharmacist123")
    print("Test users ready.")
