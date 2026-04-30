from django.db import models
from users.models import User

class DocumentType(models.TextChoices):
    INVOICE = 'invoice', 'Invoice'
    RECEIPT = 'receipt', 'Receipt'
    CONTRACT = 'contract', 'Contract'
    OTHER = 'other', 'Other'

class Document(models.Model):
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/%Y/%m/')
    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
        default=DocumentType.INVOICE
    )
    notes = models.TextField(blank=True, null=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_documents'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title
