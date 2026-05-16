# Generated migration for inventory.Document model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0005_supplier_batch'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('file', models.FileField(upload_to='documents/%Y/%m/')),
                ('document_type', models.CharField(
                    choices=[
                        ('license', 'Pharmacy License'),
                        ('permit', 'Operational Permit'),
                        ('insurance', 'Insurance Certificate'),
                        ('compliance', 'Compliance Certificate'),
                        ('invoice', 'Invoice'),
                        ('receipt', 'Receipt'),
                        ('contract', 'Contract'),
                        ('other', 'Other'),
                    ],
                    default='license',
                    max_length=50,
                )),
                ('notes', models.TextField(blank=True, null=True)),
                ('expiry_date', models.DateField(blank=True, null=True)),
                ('is_verified', models.BooleanField(default=False)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('uploaded_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='uploaded_documents',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
    ]
