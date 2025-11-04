# from rest_framework import generics, permissions
# from rest_framework.response import Response
# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.permissions import IsAuthenticated
# from django.shortcuts import get_object_or_404
# from ..models import User, RoleChoices
# from ..serializers.admin_serializers import AdminPharmacistCreateSerializer
# from ..serializers.admin_serializers import AdminUserCreateSerializer
# from ..serializers.admin_serializers import AdminUserDetailSerializer
# 
# class AdminPharmacistCreate(generics.CreateAPIView):
#     """
#     Admin endpoint to create pharmacist accounts.
#     Only accessible by admin users.
#     """
#     serializer_class = AdminPharmacistCreateSerializer
#     permission_classes = [IsAuthenticated, permissions.IsAdminUser]
# 
#     def perform_create(self, serializer):
#         serializer.save()
#         return Response({"message": "Pharmacist created successfully."})
# 
# 
# class AdminUserCreate(generics.CreateAPIView):
#     """
#     Admin endpoint to create either an admin or a pharmacist.
#     Only accessible by admin users.
#     """
#     serializer_class = AdminUserCreateSerializer
#     permission_classes = [IsAuthenticated, permissions.IsAdminUser]
# 
#     def perform_create(self, serializer):
#         serializer.save()
#         return Response({"message": "User created successfully."})
# 
# @api_view(['GET'])
# @permission_classes([IsAuthenticated, permissions.IsAdminUser])
# def list_pharmacists(request):
#     """
#     Admin endpoint to list all pharmacists.
#     """
#     pharmacists = User.objects.filter(role=RoleChoices.PHARMACIST).order_by('-created_at')
#     serializer = AdminPharmacistCreateSerializer(pharmacists, many=True)
#     return Response(serializer.data)
# 
# @api_view(['DELETE'])
# @permission_classes([IsAuthenticated, permissions.IsAdminUser])
# def delete_pharmacist(request, user_id):
#     """
#     Admin endpoint to delete a pharmacist account.
#     """
#     try:
#         pharmacist = User.objects.get(id=user_id, role=RoleChoices.PHARMACIST)
#         pharmacist.delete()
#         return Response({"message": "Pharmacist deleted successfully."})
#     except User.DoesNotExist:
#         return Response({"error": "Pharmacist not found."}, status=404)
# 
# 
# @api_view(["GET", "PATCH", "DELETE"])
# @permission_classes([IsAuthenticated, permissions.IsAdminUser])
# def admin_user_detail(request, user_id):
#     """
#     Admin endpoint to retrieve, update or delete a user.
#     """
#     user = get_object_or_404(User, id=user_id)
# 
#     if request.method == "GET":
#         serializer = AdminUserDetailSerializer(user)
#         return Response(serializer.data)
# 
#     if request.method == "PATCH":
#         serializer = AdminUserDetailSerializer(user, data=request.data, partial=True)
#         if serializer.is_valid():
#             serializer.save()
#             return Response(serializer.data)
#         return Response(serializer.errors, status=400)
# 
#     if request.method == "DELETE":
#         user.delete()
#         return Response({"message": "User deleted successfully."})
