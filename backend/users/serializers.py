from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, Pharmacy, PharmacyDocument

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

class PharmacySerializer(serializers.ModelSerializer):
    """Serializer for the Pharmacy model."""
    documents = PharmacyDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Pharmacy
        fields = ['id', 'name', 'address', 'contact_phone', 'license_number', 'is_active', 'documents']
        read_only_fields = ['created_at', 'updated_at']

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile information."""
    pharmacy_name = serializers.CharField(source='pharmacy.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'pharmacy', 
            'pharmacy_name', 'phone_number', 'profile_picture',
            'first_name', 'last_name', 'full_name', 'is_active', 'is_verified',
            'must_change_password'
        ]
        read_only_fields = ['id', 'role', 'is_verified', 'full_name']

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
        username = data.get('username')
        password = data.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError("Unable to log in with provided credentials.")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled.")
            data['user'] = user
        else:
            raise serializers.ValidationError("Must include 'username' and 'password'.")
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
