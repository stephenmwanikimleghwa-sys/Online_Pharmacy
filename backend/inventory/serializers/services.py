from rest_framework import serializers
from ..models.services import ClinicalService, SoldService

class ClinicalServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicalService
        fields = '__all__'

class SoldServiceSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    sold_by_name = serializers.CharField(source='sold_by.username', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = SoldService
        fields = '__all__'
        read_only_fields = ['sold_by', 'branch']
