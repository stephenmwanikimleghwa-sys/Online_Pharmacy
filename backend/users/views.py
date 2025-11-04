from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
"""
Legacy module kept for compatibility. The project now uses the
`users.views` package (submodules `core_views` and `admin_views`).

Avoid placing view logic in this module to prevent import-name
collisions between the `views.py` module and the `views/` package.

If code still imports this module, import specific views from
`users.views.core_views` or `users.views.admin_views` instead.
"""

# Intentionally empty to avoid circular import issues.
__all__ = []

