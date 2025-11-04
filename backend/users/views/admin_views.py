from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from ..models import User, RoleChoices


@api_view(['POST'])
@permission_classes([IsAuthenticated, permissions.IsAdminUser])
def admin_create_user(request):
    """
    Admin endpoint to create a user (admin or pharmacist).
    Expects: username, password, email, full_name, role ("admin" or "pharmacist"), optional pharmacy_license
    """
    data = request.data
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    full_name = data.get('full_name', '')
    role = (data.get('role') or '').lower()

    if not username or not password or not email or role not in ('admin', 'pharmacist'):
        return Response({'error': 'username, password, email and role (admin|pharmacist) are required'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists() or User.objects.filter(email=email).exists():
        return Response({'error': 'User with this username or email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    first_name = ''
    last_name = ''
    if full_name:
        parts = full_name.split(None, 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''

    user = User.objects.create_user(username=username, email=email, password=password)
    user.first_name = first_name
    user.last_name = last_name
    user.role = RoleChoices.ADMIN if role == 'admin' else RoleChoices.PHARMACIST
    user.is_active = True
    user.is_verified = True
    user.save()

    return Response({'message': f'{role.title()} created successfully.', 'user_id': user.id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, permissions.IsAdminUser])
def list_pharmacists(request):
    """
    Admin endpoint to list all pharmacists. Kept for backward compatibility.
    """
    pharmacists = User.objects.filter(role=RoleChoices.PHARMACIST).order_by('-created_at')
    data = [
        {
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'role': u.role,
            'is_verified': u.is_verified,
            'first_name': u.first_name,
            'last_name': u.last_name,
        }
        for u in pharmacists
    ]
    return Response(data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, permissions.IsAdminUser])
def delete_pharmacist(request, user_id):
    """
    Admin endpoint to delete a pharmacist account (kept for compatibility).
    """
    try:
        pharmacist = User.objects.get(id=user_id, role=RoleChoices.PHARMACIST)
        pharmacist.delete()
        return Response({"message": "Pharmacist deleted successfully."})
    except User.DoesNotExist:
        return Response({"error": "Pharmacist not found."}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, permissions.IsAdminUser])
def delete_user(request, user_id):
    """
    Admin endpoint to delete any user by id.
    """
    try:
        user = User.objects.get(id=user_id)
        user.delete()
        return Response({"message": "User deleted successfully."})
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=404)


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated, permissions.IsAdminUser])
def update_user(request, user_id):
    """
    Admin endpoint to update user fields (first_name, last_name, email, role, is_verified).
    """
    user = get_object_or_404(User, id=user_id)
    data = request.data
    if 'first_name' in data:
        user.first_name = data.get('first_name')
    if 'last_name' in data:
        user.last_name = data.get('last_name')
    if 'email' in data:
        user.email = data.get('email')
    if 'role' in data:
        role = data.get('role').lower()
        if role in ('admin', 'pharmacist', 'customer'):
            user.role = role
    if 'is_verified' in data:
        user.is_verified = bool(data.get('is_verified'))
    user.save()
    return Response({'message': 'User updated successfully.'})