from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0017_user_permission_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="branch",
            name="branch_type",
            field=models.CharField(
                choices=[("CHEMIST", "Chemist"), ("AGROVET", "Agrovet")],
                default="CHEMIST",
                max_length=20,
                verbose_name="Branch Type",
            ),
        ),
    ]
