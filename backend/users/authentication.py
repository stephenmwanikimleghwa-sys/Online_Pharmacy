"""
JWT authentication that attaches request.active_branch from token claims.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication

from users.models import Branch


class BranchAwareJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        request.active_branch = None

        if result is None:
            return None

        user, validated_token = result
        branch_id = validated_token.get("active_branch_id")
        if branch_id is not None:
            try:
                request.active_branch = Branch.objects.get(
                    pk=branch_id, is_active=True
                )
            except (Branch.DoesNotExist, TypeError, ValueError):
                request.active_branch = None

        # Update last_activity if more than 5 minutes ago to avoid db spam
        from django.utils import timezone
        now = timezone.now()
        if not user.last_activity or (now - user.last_activity).total_seconds() > 300:
            user.last_activity = now
            user.save(update_fields=['last_activity'])

        return user, validated_token
