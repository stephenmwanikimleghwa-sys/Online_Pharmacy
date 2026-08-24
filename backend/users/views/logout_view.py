"""
Logout view that blacklists the submitted refresh token.

SECURITY (C5): Tokens must be revocable. The simplejwt token_blacklist app
is already installed. Calling logout() blacklists the refresh token, meaning
it cannot be used to obtain new access tokens. The access token will
naturally expire (see SIMPLE_JWT ACCESS_TOKEN_LIFETIME).
"""
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import logging

logger = logging.getLogger(__name__)


class LogoutView(APIView):
    """
    Blacklist the user's refresh token on logout.

    POST body: {"refresh": "<refresh_token>"}
    Returns 205 Reset Content on success.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            logger.info("User %s logged out and token blacklisted.", request.user.username)
            return Response(
                {"message": "Successfully logged out."},
                status=status.HTTP_205_RESET_CONTENT,
            )
        except TokenError as e:
            logger.warning("Logout attempted with invalid token for user %s: %s", request.user.username, str(e))
            return Response(
                {"error": "Token is invalid or already expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
