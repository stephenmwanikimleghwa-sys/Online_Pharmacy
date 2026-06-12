import os, sys, django
sys.path.append('/home/steve/pharmacy-aggregator/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User, Branch
from products.models import Product, BranchStock
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.first()
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

client = APIClient(SERVER_NAME='localhost')
client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

# Try first product using the correct inventory URL
product = Product.objects.first()
branch = Branch.objects.get(id=1)
BranchStock.objects.get_or_create(product=product, branch=branch, defaults={'quantity': 0})
print(f"Product ID: {product.id}, Name: {product.name}")

# Test /api/inventory/<pk>/restock/ (which is what frontend calls)
data = {"quantity": 5, "reason": "test", "branch_id": 1}
response = client.post(f'/api/inventory/{product.id}/restock/', data, format='json')
print(f"STATUS: {response.status_code}")
print(f"BODY: {response.content.decode()}")
