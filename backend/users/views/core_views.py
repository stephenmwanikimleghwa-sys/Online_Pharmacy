from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from users.serializers import (
    UserLoginSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from users.models import User, RoleChoices
from rest_framework_simplejwt.tokens import RefreshToken
import logging

logger = logging.getLogger(__name__)


# Registration views removed - only admin can create users


class UserLoginView(APIView):
    """
    Login view to authenticate users and return JWT tokens.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        try:
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
        except Exception as exc:
            # Log unexpected errors for debugging
            logger.exception("Unexpected error during login: %s", exc)
            return Response(
                {"detail": "Internal server error during login."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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
            user.must_change_password = False
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


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile(request):
    """
    Get or update the authenticated user's profile.
    """
    if request.method == "GET":
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    elif request.method == "PATCH":
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserProfileSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    """
    Step 1: Request a password reset link.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.filter(email=email).first()
            
            if user:
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # In a real app, you'd send an email with a link like:
                # http://frontend-url/password-reset-confirm/uid/token
                reset_url = f"{settings.FRONTEND_URL}/password-reset-confirm/{uid}/{token}/"
                
                subject = "Password Reset Requested"
                message = f"Click the link below to reset your password:\n{reset_url}"
                
                try:
                    send_mail(
                        subject,
                        message,
                        settings.EMAIL_HOST_USER,
                        [email],
                        fail_silently=False,
                    )
                except Exception as e:
                    logger.error(f"Failed to send password reset email: {e}")

            return Response(
                {"message": "If an account exists with this email, a reset link has been sent."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(APIView):
    """
    Step 2: Confirm password reset using token and uid.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            uidb64 = serializer.validated_data['uidb64']
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']
            
            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                user = None

            if user is not None and default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                return Response(
                    {"message": "Password reset successful. You can now log in with your new password."},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {"error": "Invalid or expired reset link."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
