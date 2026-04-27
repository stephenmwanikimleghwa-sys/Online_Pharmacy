# Generated migration to add is_featured field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_product_products_pharmac_11712f_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='is_featured',
            field=models.BooleanField(default=False, verbose_name='Is Featured'),
        ),
    ]