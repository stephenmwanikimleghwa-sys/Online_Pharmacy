# from rest_framework import serializers
# from ..models import User, RoleChoices
# 
# class AdminPharmacistCreateSerializer(serializers.ModelSerializer):
#     password = serializers.CharField(write_only=True, required=True)
#     email = serializers.EmailField(required=True)
#     full_name = serializers.CharField(required=True)
#     pharmacy_license = serializers.CharField(required=True)
# 
#     class Meta:
#         model = User
#         fields = ('username', 'email', 'password', 'full_name', 'pharmacy_license')
#     
#     def validate(self, data):
#         if User.objects.filter(email=data['email']).exists():
#             raise serializers.ValidationError({'email': 'User with this email already exists.'})
#         return data
#     
#     def create(self, validated_data):
#         validated_data['role'] = RoleChoices.PHARMACIST
#         validated_data['is_active'] = True
#         validated_data['is_verified'] = True  # Auto-verify since admin is creating
#         user = User.objects.create_user(**validated_data)
#         return user
# 
# 
# class AdminUserCreateSerializer(serializers.ModelSerializer):
#     """Serializer for admin to create another admin or a pharmacist."""
#     password = serializers.CharField(write_only=True, required=True)
#     email = serializers.EmailField(required=True)
# 
#     class Meta:
#         model = User
#         fields = ("username", "email", "password", "first_name", "last_name", "role")
# 
#     def validate(self, data):
#         if User.objects.filter(email=data["email"]).exists():
#             raise serializers.ValidationError({"email": "User with this email already exists."})
#         if User.objects.filter(username=data["username"]).exists():
#             raise serializers.ValidationError({"username": "User with this username already exists."})
#         if data.get("role") not in [RoleChoices.ADMIN, RoleChoices.PHARMACIST]:
#             raise serializers.ValidationError({"role": "Role must be 'admin' or 'pharmacist'."})
#         return data
# 
#     def create(self, validated_data):
#         role = validated_data.pop("role")
#         password = validated_data.pop("password")
#         # common flags
#         validated_data["is_active"] = True
#         validated_data["is_verified"] = True
# 
#         if role == RoleChoices.ADMIN:
#             validated_data["role"] = RoleChoices.ADMIN
#             # mark as staff so IsAdminUser permission works
#             validated_data["is_staff"] = True
#             # do not auto-grant superuser
#             validated_data["is_superuser"] = False
#         else:
#             validated_data["role"] = RoleChoices.PHARMACIST
# 
#         # create user
#         user = User.objects.create_user(**validated_data)
#         user.set_password(password)
#         # ensure staff flag persisted for admin
#         if role == RoleChoices.ADMIN:
#             user.is_staff = True
#         user.save()
#         return user
# 
# 
# class AdminUserDetailSerializer(serializers.ModelSerializer):
#     """Serializer for admin to view/update a user."""
# 
#     class Meta:
#         model = User
#         fields = (
#             "id",
#             "username",
#             "email",
#             "first_name",
#             "last_name",
#             "role",
#             "is_verified",
#             "is_active",
#             "is_staff",
#             "created_at",
#             "updated_at",
#         )
#         read_only_fields = ("id", "created_at", "updated_at")
# 
#     def validate_role(self, value):
#         if value not in [RoleChoices.ADMIN, RoleChoices.PHARMACIST]:
#             raise serializers.ValidationError("Role must be 'admin' or 'pharmacist'.")
#         return value
# 
#     def update(self, instance, validated_data):
#         # handle role changes
#         role = validated_data.get("role")
#         if role:
#             instance.role = role
#             if role == RoleChoices.ADMIN:
#                 instance.is_staff = True
#             else:
#                 instance.is_staff = False
# 
#         # other updatable fields
#         for attr in ("email", "first_name", "last_name", "is_verified", "is_active"):
#             if attr in validated_data:
#                 setattr(instance, attr, validated_data[attr])
# 
#         instance.save()
#         return instance
