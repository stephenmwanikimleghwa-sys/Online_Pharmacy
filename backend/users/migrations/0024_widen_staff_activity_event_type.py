from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0023_supplier_intelligence_and_batch_fefo"),
    ]

    operations = [
        migrations.AlterField(
            model_name="staffactivitylog",
            name="event_type",
            field=models.CharField(default="LOGIN", max_length=50),
        ),
    ]
