from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.password_validation import validate_password
from django.shortcuts import get_object_or_404
from users.models import User, RoleChoices, Branch
from users.permissions import IsAdminUser
from config.api_responses import (
    ApiErrorCode,
    api_duplicate,
    api_not_found,
    api_success,
    api_validation_error,
)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_create_user(request):
    data = request.data
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    full_name = data.get('full_name', '')
    role = (data.get('role') or '').lower()

    missing = [f for f, v in [
        ('username', username), ('password', password), ('email', email), ('role', role),
    ] if not v]
    if missing or role not in ('admin', 'pharmacist'):
        return api_validation_error(
            "Username, password, email and role (admin or pharmacist) are required.",
            details={"missing_fields": missing},
        )

    if User.objects.filter(username=username).exists() or User.objects.filter(email=email).exists():
        return api_duplicate(
            "A user with this username or email already exists.",
            details={"username": username, "email": email},
        )

    branch = None
    branch_id = data.get('branch_id') or data.get('branch')
    if branch_id:
        branch = get_object_or_404(Branch, id=branch_id)

    permission_flags = data.get('permission_flags') or {}
    if not isinstance(permission_flags, dict):
        return api_validation_error("permission_flags must be an object.")

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
    user.branch = branch
    user.permission_flags = permission_flags
    user.is_active = True
    user.is_verified = True
    user.save()

    return api_success(
        f"Account for {username} has been created. They can now log in.",
        data={"user_id": user.id},
        extra={"user_id": user.id},
        http_status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_pharmacists(request):
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
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_pharmacist(request, user_id):
    try:
        pharmacist = User.objects.get(id=user_id, role=RoleChoices.PHARMACIST)
        username = pharmacist.username
        pharmacist.delete()
        return api_success(f"{username} has been removed from the system.")
    except User.DoesNotExist:
        return api_not_found("Pharmacist not found.", details={"user_id": user_id})
    except ProtectedError:
        return api_duplicate(
            "This pharmacist cannot be deleted because they have related records. Deactivate them instead.",
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        username = user.username
        user.delete()
        return api_success(f"{username} has been removed from the system.")
    except User.DoesNotExist:
        return api_not_found("User not found.", details={"user_id": user_id})
    except ProtectedError:
        return api_duplicate(
            "This user cannot be deleted because they have related records. Deactivate them instead.",
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def deactivate_user(request, user_id):
    user = get_object_or_404(User, id=user_id)
    user.is_active = not user.is_active
    user.save(update_fields=['is_active'])
    if user.is_active:
        return api_success(f"{user.username}'s account has been reactivated.")
    return api_success(
        f"{user.username}'s account has been deactivated. They can no longer log in.",
        data={"is_active": user.is_active},
        extra={"is_active": user.is_active},
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_reset_password(request, user_id):
    user = get_object_or_404(User, id=user_id)
    new_password = request.data.get('new_password')
    if not new_password:
        return api_validation_error(
            "new_password is required.",
            details={"missing_fields": ["new_password"]},
        )

    try:
        validate_password(new_password, user=user)
    except Exception as exc:
        messages = getattr(exc, "messages", [str(exc)])
        return api_validation_error(
            "Password does not meet security requirements.",
            details={"new_password": list(messages)},
        )

    user.set_password(new_password)
    user.must_change_password = True
    user.save()
    return api_success(
        f"{user.username} will be prompted to set a new password on next login.",
    )


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_user(request, user_id):
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
    if 'branch_id' in data or 'branch' in data:
        branch_id = data.get('branch_id', data.get('branch'))
        if branch_id:
            user.branch = get_object_or_404(Branch, id=branch_id)
        else:
            user.branch = None
    if 'permission_flags' in data:
        permission_flags = data.get('permission_flags')
        if not isinstance(permission_flags, dict):
            return api_validation_error("permission_flags must be an object.")
        user.permission_flags = permission_flags
    if 'is_verified' in data:
        user.is_verified = bool(data.get('is_verified'))
    if 'is_active' in data:
        user.is_active = bool(data.get('is_active'))
    user.save()
    return api_success(
        f"{user.username}'s access permissions have been updated.",
    )
