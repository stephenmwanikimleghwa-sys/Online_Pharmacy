import os
import sys
import django

sys.path.append('/home/steve/pharmacy-aggregator/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from inventory.views.inventory import inventory_list
from users.models import User

factory = RequestFactory()
request = factory.get('/api/inventory/list/')
request.user = User.objects.filter(is_superuser=True).first()
response = inventory_list(request)
print("STATUS:", response.status_code)
print("CONTENT:", response.content.decode('utf-8'))
