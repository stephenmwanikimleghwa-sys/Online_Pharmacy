# Generated manually — default department CHEMIST (was OTHER)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0027_classify_products_and_update_branches"),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="department",
            field=models.CharField(
                choices=[
                    ("CHEMIST", "Chemist"),
                    ("AGROVET", "Agrovet"),
                    ("OTHER", "Other"),
                ],
                default="CHEMIST",
                help_text="Pharmacy department: CHEMIST or AGROVET",
                max_length=50,
                verbose_name="Department",
            ),
        ),
    ]
