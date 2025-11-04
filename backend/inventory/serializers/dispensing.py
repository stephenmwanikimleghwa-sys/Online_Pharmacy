from rest_framework import serializers
from ..models.dispensing import (
    Prescription,
    PrescriptionItem,
    Dispensation,
    DispensationItem
)
from products.serializers import ProductSerializer

class PrescriptionItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = PrescriptionItem
        fields = [
            'id', 'product', 'product_details', 'prescribed_quantity',
            'dispensed_quantity', 'dosage_instructions'
        ]

class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'patient_name', 'patient_age', 'prescriber_name',
            'prescription_date', 'notes', 'status', 'verified_by',
            'verified_by_name', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['verified_by', 'created_by', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        prescription = Prescription.objects.create(**validated_data)
        
        for item_data in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item_data)
        
        return prescription

class DispensationItemSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = DispensationItem
        fields = [
            'id', 'product', 'product_details', 'quantity',
            'price_per_unit', 'total_price', 'batch_number',
            'expiry_date'
        ]
        read_only_fields = ['total_price']

class DispensationSerializer(serializers.ModelSerializer):
    items = DispensationItemSerializer(many=True)
    dispensed_by_name = serializers.CharField(
        source='dispensed_by.get_full_name',
        read_only=True
    )
    
    class Meta:
        model = Dispensation
        fields = [
            'id', 'sale_type', 'prescription', 'patient_name',
            'dispensed_by', 'dispensed_by_name', 'dispensed_at',
            'total_amount', 'notes', 'shift_info', 'items'
        ]
        read_only_fields = ['dispensed_by', 'dispensed_at', 'total_amount', 'shift_info']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        dispensation = Dispensation.objects.create(**validated_data)
        
        total_amount = 0
        for item_data in items_data:
            item = DispensationItem.objects.create(dispensation=dispensation, **item_data)
            total_amount += item.total_price
        
        dispensation.total_amount = total_amount
        dispensation.save()
        
        return dispensation