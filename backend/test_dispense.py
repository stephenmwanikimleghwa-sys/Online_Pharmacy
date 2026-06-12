import os
import sys
import django

sys.path.append('/home/steve/pharmacy-aggregator/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User, Branch
from products.models import Product, BranchStock
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.first()
peak_farm = Branch.objects.get(id=4)
user.branch = peak_farm
user.active_branch_id = peak_farm.id
user.save()

refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

client = APIClient(SERVER_NAME='localhost')
client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

product = Product.objects.first()
BranchStock.objects.get_or_create(product=product, branch=peak_farm, defaults={'quantity': 100})

data = {
    "items": [{"product_id": product.id, "quantity": 1}],
    "payment_mode": "CASH",
}
response = client.post('/api/inventory/dispense/otc/', data, format='json', HTTP_X_BRANCH_ID='4')
print("STATUS CODE:", response.status_code)
if response.status_code == 200:
    print("BRANCH NAME:", response.json().get('data', {}).get('branch_name'))
    print("JSON DATA:", list(response.json().get('data', {}).keys()))
else:
    print("RESPONSE BODY:", response.content.decode('utf-8'))
