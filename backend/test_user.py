from users.models import User
user = User.objects.filter(username="mwaniki").first()
if user:
    print(f"Found user: {user.username} (role={user.role} verified={user.is_verified})")
