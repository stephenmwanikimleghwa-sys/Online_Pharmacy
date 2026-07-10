from django.db import models
from django.conf import settings
from products.models import Product
from django.utils import timezone
from inventory.tasks import send_async_email
from django.template.loader import render_to_string

class RestockRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='restock_requests')
    branch = models.ForeignKey(
        'users.Branch',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='restock_requests',
        verbose_name='Branch',
        help_text='The branch making this restock request.'
    )
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='restock_requests_created')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='restock_requests_approved'
    )
    requested_quantity = models.PositiveIntegerField()
    current_quantity = models.PositiveIntegerField()  # Stock level when requested
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    supplier = models.CharField(max_length=255, blank=True)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Restock request for {self.product.name} - {self.status}"
        
    def save(self, *args, **kwargs):
        # If status is changing to completed, set completed_at
        old_instance = None
        if self.pk:
            old_instance = RestockRequest.objects.get(pk=self.pk)
            if old_instance.status != 'completed' and self.status == 'completed':
                self.completed_at = timezone.now()
        
        super().save(*args, **kwargs)
        
        # Send notifications on status changes
        if old_instance:
            if old_instance.status != self.status:
                self.send_status_notification()
        else:
            # New request
            self.send_status_notification()
    
    def send_status_notification(self):
        """Send email notification about status change"""
        subject = f'Restock Request Status Update - {self.get_status_display()}'
        
        context = {
            'request': self,
            'product': self.product,
            'status': self.get_status_display(),
            'notes': self.notes,
        }
        
        # HTML email template (create this file)
        html_message = render_to_string('inventory/email/restock_status_update.html', context)
        
        # Send to requester
        if self.requested_by.email:
            send_async_email.delay(
                subject,
                f'The status of your restock request for {self.product.name} has been updated to {self.get_status_display()}.',
                None,  # Use default FROM email
                [self.requested_by.email],
                html_message=html_message
            )
        
        # Send to approver if request was just created
        if self.status == 'pending':
            # Get all admin/pharmacist users
            from users.models import User, RoleChoices
            admins = User.objects.filter(
                models.Q(is_superuser=True) | models.Q(role=RoleChoices.PHARMACIST),
                is_active=True,
                email__isnull=False
            ).values_list('email', flat=True)
            
            if admins:
                send_async_email.delay(
                    'New Restock Request Requires Approval',
                    f'A new restock request for {self.product.name} requires your approval.',
                    None,
                    list(admins),
                    html_message=html_message
                )