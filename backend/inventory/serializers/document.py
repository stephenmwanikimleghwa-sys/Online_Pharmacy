from rest_framework import serializers
from ..models.document import Document


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file', 'document_type',
            'notes', 'expiry_date', 'is_verified', 'is_expired',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at', 'uploaded_by_name', 'is_expired']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['uploaded_by'] = user
        return super().create(validated_data)
