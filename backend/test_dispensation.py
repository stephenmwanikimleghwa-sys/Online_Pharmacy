import os
import sys
import django

sys.path.append('/home/steve/pharmacy-aggregator/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from inventory.models.dispensing import Dispensation
fields = [f.name for f in Dispensation._meta.get_fields()]
print("Dispensation fields:", fields)
