from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    PharmacistRegistrationSerializer,
)
from .models import User, RoleChoices
from rest_framework_simplejwt.tokens import RefreshToken


class UserRegistrationView(generics.CreateAPIView):
    """
    Register a new customer user.
    """

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "access": str(refresh.access_token),
                    "user": UserProfileSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PharmacistRegistrationView(generics.CreateAPIView):
    """
    Register a new pharmacist user (requires admin verification).
    """

    queryset = User.objects.all()
    serializer_class = PharmacistRegistrationSerializer
    permission_classes = [AllowAny]


class UserLoginView(APIView):
    """
    Login view to authenticate users and return JWT tokens.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "user": UserProfileSerializer(user).data,
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve and update user profile.
    """

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        # Use update serializer for partial updates
        partial = True
        serializer = UserUpdateSerializer(
            self.get_object(), data=request.data, partial=partial
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserProfileSerializer(self.get_object()).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    Change user password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data["new_password"])
            user.save()
            return Response(
                {"message": "Password changed successfully."}, status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated, permissions.IsAdminUser])
def admin_user_list(request):
    """
    Admin-only view to list all users.
    """
    users = User.objects.all().order_by("-created_at")
    serializer = UserProfileSerializer(users, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, permissions.IsAdminUser])
def verify_pharmacist(request, user_id):
    """
    Admin verifies a pharmacist account.
    """
    user = get_object_or_404(User, id=user_id, role=RoleChoices.PHARMACIST)
    user.is_verified = True
    user.save()
    return Response(
        {"message": f"Pharmacist {user.username} has been verified."},
        status=status.HTTP_200_OK,
    )
