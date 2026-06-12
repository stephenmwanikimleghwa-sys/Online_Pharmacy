import os
import sys
import django

sys.path.append('/home/steve/pharmacy-aggregator/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.first()
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

client = APIClient(SERVER_NAME='localhost')
client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

response = client.get('/api/inventory/list/')
print("STATUS CODE:", response.status_code)
if response.status_code >= 400:
    import json
    try:
        print("RESPONSE BODY:", json.dumps(response.json(), indent=2))
    except:
        print("RESPONSE BODY:", response.content.decode('utf-8')[:1000])
else:
    print("RESPONSE BODY START:", response.content.decode('utf-8')[:500])
