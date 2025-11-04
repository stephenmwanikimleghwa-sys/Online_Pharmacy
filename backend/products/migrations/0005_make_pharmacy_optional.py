from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_merge_20251031_1133'),
    ]

    operations = [
        migrations.RunSQL(
            "ALTER TABLE products ALTER COLUMN pharmacy_id DROP NOT NULL;",
            "ALTER TABLE products ALTER COLUMN pharmacy_id SET NOT NULL;"
        ),
    ]