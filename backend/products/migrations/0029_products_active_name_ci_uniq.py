# Partial unique index: one active product per case/whitespace-insensitive name.
# Applied on Supabase already; this keeps Django state in sync and is idempotent.

from django.db import migrations, models
from django.db.models.functions import Lower, Trim


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0028_default_department_chemist"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddConstraint(
                    model_name="product",
                    constraint=models.UniqueConstraint(
                        Lower(Trim("name")),
                        condition=models.Q(is_active=True),
                        name="products_active_name_ci_uniq",
                    ),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    CREATE UNIQUE INDEX IF NOT EXISTS products_active_name_ci_uniq
                    ON public.products (lower(btrim(name)))
                    WHERE is_active IS TRUE;
                    """,
                    reverse_sql="DROP INDEX IF EXISTS products_active_name_ci_uniq;",
                ),
            ],
        ),
    ]
