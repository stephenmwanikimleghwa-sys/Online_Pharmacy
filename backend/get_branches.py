import os
import sys
import django

sys.path.append('/home/steve/pharmacy-aggregator/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import Branch
for b in Branch.objects.all():
    print(f"ID: {b.id}, NAME: {b.name}")
