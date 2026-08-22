import os
import sys

# Get the directory containing this file
cwd = os.path.dirname(os.path.abspath(__file__))

# Add it to the Python path if it's not already there
if cwd not in sys.path:
    sys.path.insert(0, cwd)

# Tell Django where your settings are located
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Create the WSGI application object that Passenger expects
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
