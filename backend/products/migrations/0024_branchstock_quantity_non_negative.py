"""
Migration: Add non-negative constraint to branch_stock.quantity

- Resets any existing negative quantities to 0 (data cleanup)
- Adds CHECK constraint: quantity >= 0
- Adds MinValueValidator(0) via Django constraint object
"""
from django.db import migrations, models
import django.core.validators
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0023_drop_stocklog_positive_constraints"),
    ]

    operations = [
        # 1. Reset any residual negative quantities to 0 (safety net for any env
        #    that didn't get the direct SQL cleanup applied above).
        migrations.RunSQL(
            sql="UPDATE branch_stock SET quantity = 0 WHERE quantity < 0;",
            reverse_sql=migrations.RunSQL.noop,
        ),

        # 2. Add the database-level CHECK constraint so no code path —
        #    including raw SQL — can set quantity below 0.
        migrations.AddConstraint(
            model_name="branchstock",
            constraint=models.CheckConstraint(
                check=models.Q(quantity__gte=Decimal("0")),
                name="branch_stock_quantity_non_negative",
            ),
        ),

        # 3. Reflect MinValueValidator(0) on the Django field so that
        #    full_clean() / form validation also catches it early.
        migrations.AlterField(
            model_name="branchstock",
            name="quantity",
            field=models.DecimalField(
                max_digits=15,
                decimal_places=2,
                default=Decimal("0.00"),
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                verbose_name="Stock Quantity",
                help_text="Current stock level at this branch (cannot be negative)",
            ),
        ),
    ]
