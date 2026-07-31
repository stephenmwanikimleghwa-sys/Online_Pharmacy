# Generated migration to add is_featured field

from django.db import migrations, models


def add_is_featured_if_missing(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    table_name = Product._meta.db_table
    # Only add the column when it isn't already there, so this stays a no-op on
    # databases (e.g. Supabase) where it was created out of band. Uses Django's
    # introspection rather than a raw information_schema query: cursor.execute()
    # returns None, so the previous `cursor.execute(...).fetchone()` chain raised
    # AttributeError on every backend and blocked all test-database creation.
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        existing_columns = {
            column.name
            for column in connection.introspection.get_table_description(cursor, table_name)
        }

    if "is_featured" not in existing_columns:
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
