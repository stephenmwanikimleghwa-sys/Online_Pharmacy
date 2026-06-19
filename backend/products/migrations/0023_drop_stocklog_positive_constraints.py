from django.db import migrations


class Migration(migrations.Migration):
    """
    Drops the PostgreSQL CHECK constraints on stock_logs.previous_quantity
    and stock_logs.new_quantity that were automatically created by
    PositiveIntegerField. These constraints prevent logging restock actions
    for branches that have negative legacy stock quantities.
    """

    dependencies = [
        ('products', '0022_allow_negative_stock_log_quantities'),
    ]

def drop_pg_constraints(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute("ALTER TABLE stock_logs DROP CONSTRAINT IF EXISTS stock_logs_previous_quantity_check;")
        schema_editor.execute("ALTER TABLE stock_logs DROP CONSTRAINT IF EXISTS stock_logs_new_quantity_check;")

    operations = [
        migrations.RunPython(drop_pg_constraints, reverse_code=migrations.RunPython.noop),
    ]
