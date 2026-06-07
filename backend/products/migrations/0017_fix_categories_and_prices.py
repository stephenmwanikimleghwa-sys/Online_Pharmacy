# Generated manually
from django.db import migrations
from decimal import Decimal

def fix_categories_and_prices(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    PricingTier = apps.get_model('products', 'PricingTier')
    
    products_to_update = []
    pricing_tiers_to_create = []
    
    # Pre-fetch existing tiers to avoid creating duplicates
    existing_tiers = set(PricingTier.objects.values_list('product_id', flat=True))
    
    for product in Product.objects.all():
        updated = False
        
        # 1. Fix category -> department mapping
        if product.category and product.category.strip().upper() in ['CHEMIST', 'AGROVET']:
            product.department = product.category.strip().upper()
            product.category = None
            updated = True
            
        if updated:
            products_to_update.append(product)
            
        # 2. Create missing PricingTiers from Product.price
        if product.id not in existing_tiers and product.price and product.price > 0:
            # RP = BP * 1.33 => BP = RP / 1.33
            bp = product.price / Decimal('1.33')
            bp = bp.quantize(Decimal('0.01'))
            
            wp = bp * Decimal('1.15')
            wp = wp.quantize(Decimal('0.01'))
            
            rp = bp * Decimal('1.33')
            rp = rp.quantize(Decimal('0.01'))
            
            pricing_tiers_to_create.append(
                PricingTier(
                    product=product,
                    buying_price=bp,
                    wholesale_price=wp,
                    retail_price=rp,
                    use_legacy_prices=False,
                    is_active=True
                )
            )
            
    # Bulk update products
    if products_to_update:
        Product.objects.bulk_update(products_to_update, ['department', 'category'])
        
    # Bulk create pricing tiers
    if pricing_tiers_to_create:
        PricingTier.objects.bulk_create(pricing_tiers_to_create, ignore_conflicts=True)

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0016_add_department_field'),
    ]

    operations = [
        migrations.RunPython(fix_categories_and_prices, reverse_code=migrations.RunPython.noop),
    ]
