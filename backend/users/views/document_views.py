from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from users.models import PharmacyDocument, RoleChoices
from users.serializers import PharmacyDocumentSerializer

class PharmacyDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing pharmacy documents (licenses, permits, etc.).
    Admins can see all documents.
    Pharmacists can manage documents for their own pharmacy.
    """
    serializer_class = PharmacyDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == RoleChoices.ADMIN:
            return PharmacyDocument.objects.all()
        elif user.role == RoleChoices.PHARMACIST and user.pharmacy:
            return PharmacyDocument.objects.filter(pharmacy=user.pharmacy)
        return PharmacyDocument.objects.none()

    def perform_create(self, serializer):
        # Automatically associate with the user's pharmacy if they are a pharmacist
        user = self.request.user
        if user.role == RoleChoices.PHARMACIST and user.pharmacy:
            serializer.save(pharmacy=user.pharmacy)
        else:
            serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Ensure only authorized people can delete
        if request.user.role == RoleChoices.ADMIN or (
            request.user.role == RoleChoices.PHARMACIST and instance.pharmacy == request.user.pharmacy
        ):
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {"error": "You do not have permission to delete this document."},
            status=status.HTTP_403_FORBIDDEN
        )
