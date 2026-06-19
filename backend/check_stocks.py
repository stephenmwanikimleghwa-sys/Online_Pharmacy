import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['DATABASE_URL'] = 'postgresql://postgres:Nyashinski%40254@db.esqkftmnuaqkawewjniy.supabase.co:5432/postgres'
django.setup()

from products.models import Product
from products.serializers.product import ProductSerializer
import json

p = Product.objects.get(id=18753)
serializer = ProductSerializer(p)
print(json.dumps(serializer.data['branch_stocks'], indent=2))
