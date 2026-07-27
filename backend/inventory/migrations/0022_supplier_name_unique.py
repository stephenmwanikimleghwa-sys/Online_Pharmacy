from django.db import migrations, models


class Migration(migrations.Migration):
    """Make Supplier.name unique in Django's model state so the serializer
    generates a UniqueValidator (returning a clean 400 on duplicate names
    instead of an uncaught IntegrityError -> HTTP 500).

    This is a STATE-ONLY change: the production database already enforces
    ``UNIQUE (name)`` via the ``suppliers_name_unique`` constraint created in
    02_suppliers.sql, so issuing another CREATE UNIQUE INDEX here would be
    redundant and could fail outright if duplicate rows already exist. App-layer
    validation (queryset .exists()) is what gives the friendly error and works
    regardless of whether a given environment has the raw SQL constraint.
    """

    dependencies = [
        ("inventory", "0021_syncoperation_stockdiscrepancy_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="supplier",
                    name="name",
                    field=models.CharField(
                        max_length=255, unique=True, verbose_name="Supplier Name"
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
