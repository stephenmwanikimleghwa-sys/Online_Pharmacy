from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, Pharmacy, PharmacyDocument, Branch, StaffActivityLog

class PharmacyDocumentSerializer(serializers.ModelSerializer):
    """Serializer for pharmacy legal documents."""
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = PharmacyDocument
        fields = [
            'id', 'pharmacy', 'document_type', 'title', 
            'file', 'expiry_date', 'is_verified', 
            'uploaded_at', 'updated_at', 'is_expired'
        ]
        # Pharmacy is set by the backend for pharmacists; clients should not send it.
        read_only_fields = ['pharmacy', 'is_verified', 'uploaded_at', 'updated_at']

class BranchSerializer(serializers.ModelSerializer):
    """Full serializer for Branch — used for CRUD and admin views."""
    pharmacy_name = serializers.CharField(source='pharmacy.name', read_only=True)
    staff_count = serializers.SerializerMethodField()
    type = serializers.CharField(source='branch_type', read_only=True)

    class Meta:
        model = Branch
        fields = [
            'id', 'pharmacy', 'pharmacy_name', 'name', 'branch_type', 'type',
            'address', 'contact_phone', 'license_number', 'is_active',
            'is_headquarters', 'staff_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'pharmacy_name', 'staff_count']

    def get_staff_count(self, obj):
        return obj.users.filter(is_active=True).count()


class BranchMiniSerializer(serializers.ModelSerializer):
    """Compact branch representation embedded inside user profiles."""
    type = serializers.CharField(source='branch_type', read_only=True)

    class Meta:
        model = Branch
        fields = ['id', 'name', 'is_headquarters', 'type']


class PharmacySerializer(serializers.ModelSerializer):
    """Serializer for the Pharmacy model."""
    documents = PharmacyDocumentSerializer(many=True, read_only=True)
    branches = BranchSerializer(many=True, read_only=True)

    class Meta:
        model = Pharmacy
        fields = ['id', 'name', 'address', 'contact_phone', 'email', 'tagline', 'license_number', 'is_active', 'documents', 'branches']
        read_only_fields = ['created_at', 'updated_at']

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile information."""
    pharmacy_name = serializers.SerializerMethodField()
    branch_info = BranchMiniSerializer(source='branch', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'pharmacy',
            'pharmacy_name', 'branch', 'branch_info',
            'phone_number', 'profile_picture',
            'first_name', 'last_name', 'full_name', 'is_active', 'is_verified',
            'must_change_password', 'can_process_sales', 'can_manage_inventory',
            'can_edit_prices', 'can_view_reports', 'can_manage_users',
            'can_delete_records', 'can_view_audit_logs', 'permission_flags'
        ]
        read_only_fields = ['id', 'role', 'is_verified', 'full_name', 'branch_info']

    def get_pharmacy_name(self, obj):
        """Handle null pharmacy gracefully."""
        if obj.pharmacy:
            return obj.pharmacy.name
        return None

class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    class Meta:
        model = User
        fields = ['email', 'phone_number', 'profile_picture', 'first_name', 'last_name', 'address', 'date_of_birth']

class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        from config.api_responses import ApiErrorCode

        username = data.get('username')
        password = data.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError({
                    "code": ApiErrorCode.INVALID_CREDENTIALS,
                    "message": "Invalid username or password, try again.",
                })
            if not user.is_active:
                raise serializers.ValidationError({
                    "code": ApiErrorCode.ACCOUNT_INACTIVE,
                    "message": "Your account has been deactivated. Please contact your administrator.",
                })
            data['user'] = user
        else:
            raise serializers.ValidationError({
                "code": ApiErrorCode.VALIDATION_ERROR,
                "message": "Username and password are required.",
            })
        return data

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value

class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting a password reset."""
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            # We don't raise an error here to prevent user enumeration
            pass
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming a password reset."""
    token = serializers.CharField()
    uidb64 = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value

class StaffActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = StaffActivityLog
        fields = ['id', 'user', 'username', 'full_name', 'event_type', 'branch', 'branch_name', 'ip_address', 'timestamp', 'details']
        read_only_fields = ['timestamp']
