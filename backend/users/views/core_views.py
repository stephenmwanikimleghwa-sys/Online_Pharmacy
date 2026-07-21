from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.views.decorators.vary import vary_on_headers
from users.serializers import (
    UserLoginSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from users.models import User, RoleChoices
from users.permissions import IsAdminUser
from users.utils import log_activity
from users.branch_auth import (
    issue_tokens,
    login_user_payload,
    resolve_branch_session,
    get_allowed_branches,
)
from config.api_responses import ApiErrorCode, api_error, api_success
import logging

logger = logging.getLogger(__name__)


class LoginRateThrottle(AnonRateThrottle):
    """Strict rate limit for the login endpoint: 5 attempts per minute per IP."""
    scope = "login"


# Registration views removed - only admin can create users


class UserLoginView(APIView):
    """
    Login view to authenticate users and return JWT tokens.
    Throttled to 5 requests/minute per IP to prevent brute-force attacks.
    """

    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        try:
            serializer = UserLoginSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.validated_data["user"]
                user = User.objects.select_related("pharmacy", "branch").get(pk=user.pk)

                if not user.is_superuser and user.role not in (RoleChoices.ADMIN, RoleChoices.CUSTOMER):
                    if not get_allowed_branches(user).exists():
                        return api_error(
                            ApiErrorCode.NO_BRANCH_ASSIGNED,
                            "Your account has not been assigned to any branch. Contact your administrator to resolve this before you can log in.",
                            details={"username": user.username},
                            http_status=status.HTTP_403_FORBIDDEN,
                        )

                session = resolve_branch_session(user)
                active_branch_id = (
                    session["active_branch"]["id"] if session["active_branch"] else None
                )
                tokens = issue_tokens(user, active_branch_id=active_branch_id)
                return api_success(
                    f"Welcome back, {user.username}.",
                    data={
                        "user": login_user_payload(user),
                        "allowed_branches": session["allowed_branches"],
                        "requires_branch_selection": session["requires_branch_selection"],
                        "active_branch": session["active_branch"],
                        "tokens": tokens,
                        "access": tokens["access"],
                        "refresh": tokens["refresh"],
                    },
                    extra={
                        "user": login_user_payload(user),
                        "allowed_branches": session["allowed_branches"],
                        "requires_branch_selection": session["requires_branch_selection"],
                        "active_branch": session["active_branch"],
                        "tokens": tokens,
                        "access": tokens["access"],
                        "refresh": tokens["refresh"],
                    },
                    http_status=status.HTTP_200_OK,
                )
            errors = serializer.errors
            code = ApiErrorCode.VALIDATION_ERROR
            message = "Please check your login details and try again."
            if isinstance(errors, dict):
                if errors.get("code"):
                    code = errors["code"][0] if isinstance(errors["code"], list) else errors["code"]
                if errors.get("message"):
                    message = (
                        errors["message"][0]
                        if isinstance(errors["message"], list)
                        else errors["message"]
                    )
                elif errors.get("non_field_errors"):
                    nf = errors["non_field_errors"]
                    message = nf[0] if isinstance(nf, list) else str(nf)
            return api_error(str(code), str(message), details=dict(errors), http_status=status.HTTP_400_BAD_REQUEST)
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
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_user_list(request):
    """
    Admin-only view to list all users.
    """
    users = User.objects.exclude(
        role=RoleChoices.CUSTOMER
    ).filter(
        is_active=True
    ).order_by("-created_at")
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
@vary_on_headers('Authorization')  # CRITICAL: Prevent cross-user data leakage
def profile(request):
    """
    Get or update the authenticated user's profile.
    """
    if request.method == "GET":
        user = User.objects.select_related("pharmacy", "branch").get(pk=request.user.pk)
        active_branch_id = None
        if getattr(request, "active_branch", None):
            active_branch_id = request.active_branch.id
        session = resolve_branch_session(user, active_branch_id=active_branch_id)
        profile_data = UserProfileSerializer(user).data
        profile_data.update(
            {
                "allowed_branches": session["allowed_branches"],
                "requires_branch_selection": session["requires_branch_selection"],
                "active_branch": session["active_branch"],
            }
        )
        return Response(profile_data)
    elif request.method == "PATCH":
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserProfileSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_my_account(request):
    """
    GDPR / Kenya DPA 2019 Right to Erasure.
    Soft deletes the user account.
    """
    user = request.user
    log_activity(
        user=user,
        event_type='ACCOUNT_DELETION_REQUESTED',
        ip_address=request.META.get('REMOTE_ADDR'),
        details_dict={'username': user.username}
    )
    user.is_active = False
    user.save()
    return api_success(
        "Account deactivated successfully. Contact admin for full data erasure.",
        http_status=status.HTTP_200_OK
    )

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


class LogoutView(APIView):
    """
    Logout view that blacklists the refresh token, preventing reuse.
    Requires the refresh token in the request body.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            from rest_framework_simplejwt.exceptions import TokenError
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"message": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
        except TokenError:
            # Token already blacklisted or invalid — treat as successful logout
            return Response({"message": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as exc:
            logger.warning("Logout error: %s", exc)
            return Response({"message": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
