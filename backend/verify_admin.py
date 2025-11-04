from users.models import User
user = User.objects.get(username="mwaniki")
user.is_verified = True
user.save()
print(f"Updated user: {user.username} (role={user.role} verified={user.is_verified})")
