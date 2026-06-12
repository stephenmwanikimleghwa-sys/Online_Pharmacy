import os
import sys
import django

sys.path.append('/home/steve/pharmacy-aggregator/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User
from products.models import Product
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.first()
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

client = APIClient(SERVER_NAME='localhost')
client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

product = Product.objects.first()
print("Restocking product", product.id)
data = {
    "quantity": 10,
    "reason": "Restock test",
    "branch_id": 1,
}
response = client.post(f'/api/inventory/{product.id}/restock/', data, format='json')
print("STATUS CODE:", response.status_code)
if response.status_code >= 400:
    print("RESPONSE BODY:", response.content.decode('utf-8'))
