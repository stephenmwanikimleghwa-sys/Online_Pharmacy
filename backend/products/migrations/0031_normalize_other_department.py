"""
Normalize leftover OTHER departments onto CHEMIST/AGROVET from product_type.
"""

from django.db import migrations


def fix_other_departments(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    Product.objects.filter(department="OTHER", product_type="AGROVET").update(
        department="AGROVET"
    )
    Product.objects.filter(department="OTHER").update(department="CHEMIST")
    # Keep sellability aligned
    Product.objects.filter(department="AGROVET").exclude(
        product_type="UNIVERSAL"
    ).update(product_type="AGROVET")
    Product.objects.filter(department="CHEMIST").exclude(
        product_type="UNIVERSAL"
    ).update(product_type="CHEMIST")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0030_align_product_type_with_department"),
    ]

    operations = [
        migrations.RunPython(fix_other_departments, noop_reverse),
    ]
