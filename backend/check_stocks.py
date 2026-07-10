import os
import django

# IMPORTANT: Set DATABASE_URL in your environment before running this script.
# Never hardcode database credentials in source files.
# Example: DATABASE_URL=postgresql://... python check_stocks.py
if not os.environ.get("DATABASE_URL"):
    raise EnvironmentError(
        "DATABASE_URL environment variable is required. "
        "Run: DATABASE_URL=<your-url> python check_stocks.py"
    )

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from products.models import Product
from products.serializers.product import ProductSerializer
import json

p = Product.objects.get(id=18753)
serializer = ProductSerializer(p)
print(json.dumps(serializer.data['branch_stocks'], indent=2))
