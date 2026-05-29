from django.db import models

class LegacyLedger(models.Model):
    """
    Read-only archive of legacy system ledger entries.
    """
    transaction_date = models.DateTimeField(verbose_name="Transaction Date")
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    transaction_type = models.CharField(max_length=50) # e.g. INCOME, EXPENSE, DEBT, PAYMENT
    payment_mode = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "legacy_ledger"
        ordering = ["-transaction_date"]
        verbose_name = "Legacy Ledger Entry"
        verbose_name_plural = "Legacy Ledger Entries"

    def __str__(self):
        return f"{self.transaction_date.strftime('%Y-%m-%d')} - {self.description} ({self.amount})"
