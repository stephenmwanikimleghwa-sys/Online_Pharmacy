# Generated migration to add is_featured field

from django.db import migrations, models


def add_is_featured_if_missing(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    table_name = Product._meta.db_table
    # Use information_schema so we don't depend on adapter-specific introspection results.
    # This avoids "DuplicateColumn: column is_featured already exists" on Supabase.
    with schema_editor.connection.cursor() as cursor:
        schema_name = cursor.execute("SELECT current_schema()").fetchone()[0]
        cursor.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = %s
              AND table_name = %s
              AND column_name = %s
            LIMIT 1
            """,
            [schema_name, table_name, "is_featured"],
        )
        exists = cursor.fetchone() is not None

    if not exists:
        field = models.BooleanField(default=False, verbose_name='Is Featured')
        field.set_attributes_from_name('is_featured')
        schema_editor.add_field(Product, field)


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_product_products_pharmac_11712f_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(add_is_featured_if_missing, reverse_code=migrations.RunPython.noop),
    ]
