from django.db import models

class Supplier(models.Model):
    """
    Model representing a supplier or distributor of pharmaceutical products.
    """
    name = models.CharField(max_length=255, verbose_name="Supplier Name")
    contact_person = models.CharField(max_length=255, blank=True, null=True, verbose_name="Contact Person")
    email = models.EmailField(blank=True, null=True, verbose_name="Email Address")
    phone = models.CharField(max_length=50, blank=True, null=True, verbose_name="Phone Number")
    address = models.TextField(blank=True, null=True, verbose_name="Address")
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="Balance")
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        db_table = "suppliers"
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"
        ordering = ["name"]

    def __str__(self):
        return self.name

class SupplierCreditTransaction(models.Model):
    """
    Model representing historical and ongoing supplier credit transactions.
    """
    TRANSACTION_TYPES = [
        ('PURCHASE_ON_CREDIT', 'Purchase on Credit'),
        ('PAYMENT', 'Payment to Supplier'),
        ('ADJUSTMENT', 'Balance Adjustment'),
    ]

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name='credit_transactions',
        verbose_name='Supplier'
    )
    transaction_type = models.CharField(
        max_length=25,
        choices=TRANSACTION_TYPES,
        verbose_name='Transaction Type'
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Amount')
    balance_after = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Balance After')
    description = models.TextField(blank=True, null=True, verbose_name='Description')
    invoice_number = models.CharField(max_length=100, blank=True, null=True, verbose_name='Invoice Number')
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_supplier_credit_transactions',
        verbose_name='Created By'
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name='Timestamp')

    class Meta:
        db_table = "supplier_credit_transactions"
        verbose_name = "Supplier Credit Transaction"
        verbose_name_plural = "Supplier Credit Transactions"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["supplier", "timestamp"]),
            models.Index(fields=["invoice_number"]),
        ]

    def __str__(self):
        return f"{self.supplier.name} - {self.get_transaction_type_display()} ({self.amount})"
