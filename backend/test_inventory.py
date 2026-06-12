import traceback
from inventory.views.inventory import inventory_list
from users.models import User
from django.test import RequestFactory
factory = RequestFactory()
request = factory.get('/api/inventory/list/')
request.user = User.objects.filter(is_superuser=True).first()
try:
    response = inventory_list(request)
    print("STATUS:", response.status_code)
    print("CONTENT:", response.content.decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
    traceback.print_exc()
