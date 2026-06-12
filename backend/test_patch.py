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
print("Patching product", product.id)
data = {
    "name": product.name,
    "category": product.category,
    "buying_price": "100",
    "use_legacy_prices": "false",
    "stock_quantity": "50",
    "dosage_form": "other",
    "strength": "",
    "shelf_location": "",
    "description": "",
    "supplier": "",
    "expiry_date": "",
}
response = client.patch(f'/api/products/{product.id}/', data, format='multipart')
print("STATUS CODE:", response.status_code)
if response.status_code >= 400:
    print("RESPONSE BODY:", response.content.decode('utf-8'))
