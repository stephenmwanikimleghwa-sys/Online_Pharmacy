# from rest_framework import serializers
# from django.contrib.auth import authenticate
# from django.contrib.auth.password_validation import validate_password
# from django.core.exceptions import ValidationError
# from .models import User, RoleChoices
# 
# 
# 
# 
# class UserLoginSerializer(serializers.Serializer):
#     username = serializers.CharField()
#     password = serializers.CharField()
# 
#     def validate(self, attrs):
#         username = attrs.get("username")
#         password = attrs.get("password")
# 
#         if username and password:
#             user = authenticate(username=username, password=password)
# 
#             if user:
#                 if not user.is_active:
#                     raise serializers.ValidationError("User account is disabled.")
#                 if not user.is_verified:
#                     raise serializers.ValidationError("User account is not verified.")
#                 if not (user.username == 'mwaniki' or user.role in [RoleChoices.ADMIN, RoleChoices.PHARMACIST]):
#                     raise serializers.ValidationError("Access denied.")
#                 attrs["user"] = user
#                 return attrs
#             else:
#                 raise serializers.ValidationError(
#                     "Unable to log in with provided credentials."
#                 )
#         else:
#             raise serializers.ValidationError("Must include 'username' and 'password'.")
# 
# 
# class UserProfileSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = User
#         fields = (
#             "id",
#             "username",
#             "email",
#             "first_name",
#             "last_name",
#             "phone_number",
#             "role",
#             "profile_picture",
#             "date_of_birth",
#             "address",
#             "is_verified",
#             "created_at",
#             "updated_at",
#         )
#         read_only_fields = (
#             "id",
#             "username",
#             "role",
#             "is_verified",
#             "created_at",
#             "updated_at",
#         )
# 
# 
# class UserUpdateSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = User
#         fields = (
#             "first_name",
#             "last_name",
#             "phone_number",
#             "profile_picture",
#             "date_of_birth",
#             "address",
#         )
# 
# 
# class ChangePasswordSerializer(serializers.Serializer):
#     old_password = serializers.CharField(required=True)
#     new_password = serializers.CharField(required=True, validators=[validate_password])
# 
#     def validate_old_password(self, value):
#         user = self.context["request"].user
#         if not user.check_password(value):
#             raise serializers.ValidationError("Old password is not correct")
#         return value
# 
# 
# 
