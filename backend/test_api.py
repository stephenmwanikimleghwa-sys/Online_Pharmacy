import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test.client import Client
from django.contrib.auth import get_user_model

User = get_user_model()
u = User.objects.filter(is_superuser=True).first()
if not u:
    u = User.objects.first()

c = Client()
c.force_login(u)
response = c.get('/api/v1/inventory/list/?per_page=5')
import json
data = response.json()
print(json.dumps(data.get('products', [])[0].get('branch_stocks'), indent=2))
