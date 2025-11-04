from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='expiry_date',
            field=models.DateField(blank=True, null=True, verbose_name='Expiry Date'),
        ),
        migrations.AddField(
            model_name='product',
            name='supplier',
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name='Supplier'),
        ),
    ]