from django.db import models
from django.utils import timezone
from users.models import User


class Document(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('license', 'Pharmacy License'),
        ('permit', 'Operational Permit'),
        ('insurance', 'Insurance Certificate'),
        ('compliance', 'Compliance Certificate'),
        ('invoice', 'Invoice'),
        ('receipt', 'Receipt'),
        ('contract', 'Contract'),
        ('other', 'Other'),
    ]

    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/%Y/%m/')
    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPE_CHOICES,
        default='license'
    )
    notes = models.TextField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
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

    @property
    def is_expired(self):
        if self.expiry_date:
            return self.expiry_date < timezone.now().date()
        return False
