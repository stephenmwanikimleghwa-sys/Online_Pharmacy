from django.db import models

class CashFlow(models.Model):
    """
    Model representing historical and daily cashbook tracking (income/expenses).
    """
    netflow = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Net Flow")
    paymentmode = models.CharField(max_length=100, verbose_name="Payment Mode")
    explanation = models.CharField(max_length=255, verbose_name="Explanation")
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cashflows',
        verbose_name="Branch"
    )
    timestamp = models.DateTimeField(verbose_name="Timestamp")

    class Meta:
        db_table = "cashflow"
        verbose_name = "Cash Flow"
        verbose_name_plural = "Cash Flows"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["branch", "timestamp"]),
        ]

    def __str__(self):
        return f"{self.paymentmode} - {self.netflow} at {self.timestamp}"


class LegacyLedgerEntry(models.Model):
    """
    Read-only archive for legacy double-entry accounting ledger rows.
    """
    account_name = models.CharField(max_length=255, verbose_name="Account Name")
    debit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="Debit")
    credit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name="Credit")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    branch = models.CharField(max_length=255, blank=True, null=True, verbose_name="Branch Name (Legacy)")
    timestamp = models.DateTimeField(verbose_name="Timestamp")
    legacy_id = models.IntegerField(verbose_name="Legacy ID", unique=True)

    class Meta:
        db_table = "legacy_ledger_entries"
        verbose_name = "Legacy Ledger Entry"
        verbose_name_plural = "Legacy Ledger Entries"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"Ledger {self.legacy_id} - {self.account_name}"
