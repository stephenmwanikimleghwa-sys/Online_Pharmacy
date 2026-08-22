from rest_framework import serializers
from products.models import Product, PricingTier
from django.core.exceptions import ValidationError
from .pricing_tier import PricingTierSerializer
from typing import Any, Dict, Optional
from decimal import Decimal


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for listing and retrieving products.
    """
    pricing_tier = PricingTierSerializer(read_only=True)
    branch_stocks = serializers.SerializerMethodField()
    # Add pricing fields for quick access
    buying_price = serializers.SerializerMethodField()
    selling_price = serializers.SerializerMethodField()
    wholesale_price = serializers.SerializerMethodField()
    # Add aggregated branch stock info
    branch_stock_summary = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "category",
            "department",
            "dosage_form",
            "manufacturer",
            "strength",
            "supplier",
            "expiry_date",
            "price",
            "pricing_tier",
            "buying_price",
            "selling_price",
            "wholesale_price",
            "stock_quantity",
            "reorder_threshold",
            "vat_obligation",
            "shelf_location",
            "branch_stocks",
            "branch_stock_summary",
            "total_stock",
            "image",
            "is_active",
            "is_low_stock",
            "expiry_status",
            "days_until_expiry",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "is_low_stock", "expiry_status", "days_until_expiry", "created_at", "updated_at")

    def to_representation(self, instance):
        """Canonical price/stock so every client sees the same numbers as the DB tiers/branches."""
        data = super().to_representation(instance)
        try:
            if not hasattr(instance, 'pricing_tier') or instance.pricing_tier is None:
                data['pricing_tier'] = None
            else:
                tier = instance.pricing_tier
                retail = float(tier.retail_price) if tier.retail_price is not None else None
                wholesale = float(tier.wholesale_price) if tier.wholesale_price is not None else None
                buying = float(tier.buying_price) if tier.buying_price is not None else None
                if retail is not None:
                    data['price'] = retail
                    data['selling_price'] = retail
                if wholesale is not None:
                    data['wholesale_price'] = wholesale
                if buying is not None:
                    data['buying_price'] = buying
        except Exception:
            data['pricing_tier'] = None

        # Prefer branch_stock sum over legacy Product.stock_quantity when branches exist
        try:
            if data.get('branch_stocks'):
                data['stock_quantity'] = data.get('total_stock', data.get('stock_quantity'))
        except Exception:
            pass
        return data

    def get_buying_price(self, instance):
        """Get buying price from pricing tier if available."""
        try:
            if hasattr(instance, 'pricing_tier') and instance.pricing_tier:
                return float(instance.pricing_tier.buying_price)
        except Exception:
            pass
        return None

    def get_selling_price(self, instance):
        """Get selling/retail price from pricing tier if available."""
        try:
            if hasattr(instance, 'pricing_tier') and instance.pricing_tier:
                return float(instance.pricing_tier.retail_price)
        except Exception:
            pass
        return None

    def get_wholesale_price(self, instance):
        """Get wholesale price from pricing tier if available."""
        try:
            if hasattr(instance, 'pricing_tier') and instance.pricing_tier:
                return float(instance.pricing_tier.wholesale_price)
        except Exception:
            pass
        return None

    def get_branch_stocks(self, instance):
        """Get branch stocks with all details."""
        return [
            {
                "branch_id": bs.branch_id,
                "branch_name": getattr(bs.branch, "name", None),
                "quantity": float(bs.quantity),
                "reorder_level": float(bs.reorder_level),
            }
            for bs in getattr(instance, "branch_stocks", []).all()
        ]

    def get_branch_stock_summary(self, instance):
        """Get summary of branch stocks as a dict for easy frontend access."""
        summary = {}
        for bs in getattr(instance, "branch_stocks", []).all():
            branch_name = getattr(bs.branch, "name", f"Branch {bs.branch_id}")
            summary[branch_name] = {
                "quantity": float(bs.quantity),
                "reorder_level": float(bs.reorder_level),
                "branch_id": bs.branch_id,
            }
        return summary

    def get_total_stock(self, instance):
        """Get total stock across all branches."""
        total = 0
        for bs in getattr(instance, "branch_stocks", []).all():
            total += float(bs.quantity)
        return total


class ProductCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new product.
    Validates price > 0, stock >= 0, requires pharmacy.
    Optionally accepts buying_price to auto-create a PricingTier.
    """

    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01, required=False)
    stock_quantity = serializers.IntegerField(min_value=0)
    buying_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0.01,
        required=False, write_only=True,
        help_text='Buying/cost price from supplier. WSP (×1.15) and SP (×1.33) are auto-calculated.'
    )
    use_legacy_prices = serializers.BooleanField(required=False, write_only=True)
    wholesale_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01, required=False, write_only=True)
    retail_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01, required=False, write_only=True)

    class Meta:
        model = Product
        fields = (
            "name",
            "description",
            "category",
            "department",
            "dosage_form",
            "manufacturer",
            "strength",
            "price",
            "buying_price",
            "use_legacy_prices",
            "wholesale_price",
            "retail_price",
            "stock_quantity",
            "supplier",
            "expiry_date",
            "shelf_location",
            "reorder_threshold",
            "vat_obligation",
            "image",
        )

    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Require either price or buying_price; honor manual prices when provided."""
        if not data.get('price') and not data.get('buying_price'):
            raise serializers.ValidationError(
                {'price': 'Provide either a Price or a Buying Price.'}
            )
        # Manual retail/wholesale must stick even if the client forgot the flag
        if data.get('retail_price') is not None or data.get('wholesale_price') is not None:
            data['use_legacy_prices'] = True
        if not data.get('department'):
            data['department'] = 'CHEMIST'
        return data

    def validate_name(self, value: str) -> str:
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("Product name is required.")
        qs = Product.objects.filter(name__iexact=name, is_active=True)
        if qs.exists():
            raise serializers.ValidationError(
                f'A product named "{name}" already exists. Open it to edit, or choose a different name.'
            )
        return name

    def validate_price(self, value: Optional[Decimal]) -> Optional[Decimal]:
        """Validate that the price is greater than 0 when provided."""
        if value is not None and value <= 0:
            raise ValidationError("Price must be greater than 0.")
        return value

    def validate_buying_price(self, value: Optional[Decimal]) -> Optional[Decimal]:
        """Validate that the buying price is greater than 0 when provided."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Buying price must be greater than 0.")
        return value

    def validate_stock_quantity(self, value: int) -> int:
        """Validate that stock quantity is non-negative."""
        if value < 0:
            raise ValidationError("Stock quantity cannot be negative.")
        return value

    def create(self, validated_data: Dict[str, Any]) -> Product:
        """Create product, then auto-create PricingTier if buying_price was supplied."""
        buying_price = validated_data.pop('buying_price', None)
        use_legacy_prices = validated_data.pop('use_legacy_prices', False)
        wholesale_price = validated_data.pop('wholesale_price', None)
        retail_price = validated_data.pop('retail_price', None)

        # If only buying_price was given, derive a fallback price (retail SP = ×1.33)
        if buying_price and not validated_data.get('price'):
            if use_legacy_prices and retail_price:
                validated_data['price'] = retail_price
            else:
                validated_data['price'] = buying_price * Decimal('1.33')

        stock_qty = validated_data.get('stock_quantity', 0) or 0
        product = super().create(validated_data)

        if buying_price is not None:
            tier = PricingTier(
                product=product,
                buying_price=buying_price,
                use_legacy_prices=use_legacy_prices
            )
            if use_legacy_prices:
                if wholesale_price is not None:
                    tier.wholesale_price = wholesale_price
                if retail_price is not None:
                    tier.retail_price = retail_price
            tier.save()

        # Ensure branch stock row exists so inventory/OTC see the product
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        branch = getattr(user, 'branch', None) if user else None
        if branch is not None:
            from products.models import BranchStock
            BranchStock.objects.get_or_create(
                product=product,
                branch=branch,
                defaults={'quantity': stock_qty},
            )

        return product


class ProductUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating product details (partial updates).
    Validates price/stock if changed.
    Optionally accepts buying_price to create-or-update the PricingTier.
    """

    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0.01, required=False
    )
    stock_quantity = serializers.IntegerField(min_value=0, required=False)
    buying_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0.01,
        required=False, write_only=True,
        help_text='Buying/cost price from supplier. WSP (×1.15) and SP (×1.33) are auto-calculated.'
    )
    use_legacy_prices = serializers.BooleanField(required=False, write_only=True)
    wholesale_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01, required=False, write_only=True)
    retail_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01, required=False, write_only=True)

    class Meta:
        model = Product
        fields = (
            "name",
            "description",
            "category",
            "department",
            "dosage_form",
            "manufacturer",
            "strength",
            "price",
            "buying_price",
            "use_legacy_prices",
            "wholesale_price",
            "retail_price",
            "stock_quantity",
            "supplier",
            "expiry_date",
            "shelf_location",
            "reorder_threshold",
            "vat_obligation",
            "image",
            "is_active",
        )

    def validate_price(self, value: Optional[Decimal]) -> Optional[Decimal]:
        """Validate that the price is greater than 0 if provided."""
        if value is not None and value <= 0:
            raise ValidationError("Price must be greater than 0.")
        return value

    def validate_name(self, value: str) -> str:
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("Product name is required.")
        qs = Product.objects.filter(name__iexact=name, is_active=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f'A product named "{name}" already exists.'
            )
        return name

    def validate_buying_price(self, value: Optional[Decimal]) -> Optional[Decimal]:
        """Validate that the buying price is greater than 0 when provided."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Buying price must be greater than 0.")
        return value

    def validate_stock_quantity(self, value: int) -> int:
        """Validate that stock quantity is non-negative if provided."""
        if value is not None and value < 0:
            raise ValidationError("Stock quantity cannot be negative.")
        return value

    def update(self, instance: Product, validated_data: Dict[str, Any]) -> Product:
        """Update product and create-or-update PricingTier if buying_price was supplied."""
        buying_price = validated_data.pop('buying_price', None)
        use_legacy_prices = validated_data.pop('use_legacy_prices', None)
        wholesale_price = validated_data.pop('wholesale_price', None)
        retail_price = validated_data.pop('retail_price', None)

        # Preserve explicit WP/RP when the client sends them (Manual pricing)
        if retail_price is not None or wholesale_price is not None:
            use_legacy_prices = True

        product = super().update(instance, validated_data)

        if buying_price is not None or use_legacy_prices is not None:
            try:
                tier = product.pricing_tier
                if buying_price is not None:
                    tier.buying_price = buying_price
                if use_legacy_prices is not None:
                    tier.use_legacy_prices = use_legacy_prices
                
                if tier.use_legacy_prices:
                    if wholesale_price is not None:
                        tier.wholesale_price = wholesale_price
                    if retail_price is not None:
                        tier.retail_price = retail_price
                        product.price = retail_price
                        product.save(update_fields=['price'])
                tier.save()
            except PricingTier.DoesNotExist:
                if buying_price is not None:
                    tier = PricingTier(
                        product=product, 
                        buying_price=buying_price,
                        use_legacy_prices=use_legacy_prices or False
                    )
                    if tier.use_legacy_prices:
                        if wholesale_price is not None: tier.wholesale_price = wholesale_price
                        if retail_price is not None: tier.retail_price = retail_price
                    tier.save()

        return product
