"""
Align product_type with department so AGROVET branches (Peakfarm) can see
seed/agrovet products that were stored as CHEMIST sellability by mistake.
"""

from django.db import migrations


def align_product_types(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    Product.objects.filter(department="AGROVET", product_type="CHEMIST").update(
        product_type="AGROVET"
    )
    Product.objects.filter(department="CHEMIST", product_type="AGROVET").update(
        product_type="CHEMIST"
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0029_products_active_name_ci_uniq"),
    ]

    operations = [
        migrations.RunPython(align_product_types, noop_reverse),
    ]
