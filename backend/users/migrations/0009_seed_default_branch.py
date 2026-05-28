"""
Data migration: Creates a default "Main Branch" for the existing Pharmacy
and assigns all pre-existing users and business records to it.
This ensures zero data loss when introducing branch-scoped data.
"""
from django.db import migrations


def create_default_branch(apps, schema_editor):
    Pharmacy = apps.get_model('users', 'Pharmacy')
    Branch = apps.get_model('users', 'Branch')
    User = apps.get_model('users', 'User')

    for pharmacy in Pharmacy.objects.all():
        branch, created = Branch.objects.get_or_create(
            pharmacy=pharmacy,
            is_headquarters=True,
            defaults={
                'name': 'Main Branch',
                'address': pharmacy.address,
                'contact_phone': pharmacy.contact_phone,
                'license_number': pharmacy.license_number,
                'is_active': True,
            }
        )
        # Assign all staff users of this pharmacy to the default branch
        User.objects.filter(pharmacy=pharmacy, branch__isnull=True).update(branch=branch)


def assign_inventory_records_to_branch(apps, schema_editor):
    """
    Assigns all existing Dispensation, Prescription, StockIntake, and
    RestockRequest records to the default (headquarters) branch of their
    associated pharmacy's user, or the first available branch.
    """
    Branch = apps.get_model('users', 'Branch')
    Dispensation = apps.get_model('inventory', 'Dispensation')
    Prescription = apps.get_model('inventory', 'Prescription')
    StockIntake = apps.get_model('inventory', 'StockIntake')
    RestockRequest = apps.get_model('inventory', 'RestockRequest')

    # Get all headquarters branches keyed by pharmacy
    hq_branches = {b.pharmacy_id: b for b in Branch.objects.filter(is_headquarters=True)}

    # Fall back to first branch if no HQ found
    all_branches = list(Branch.objects.all())
    default_branch = all_branches[0] if all_branches else None

    if not default_branch:
        return  # No pharmacy/branch seeded yet — skip

    def resolve_branch(user):
        """Get HQ branch for the user's pharmacy, or the global default."""
        if user and user.pharmacy_id and user.pharmacy_id in hq_branches:
            return hq_branches[user.pharmacy_id]
        return default_branch

    # Dispensations — scoped by who dispensed them
    for d in Dispensation.objects.filter(branch__isnull=True).select_related('dispensed_by'):
        d.branch = resolve_branch(d.dispensed_by)
        d.save(update_fields=['branch'])

    # Prescriptions — scoped by who created them
    for p in Prescription.objects.filter(branch__isnull=True).select_related('created_by'):
        p.branch = resolve_branch(p.created_by)
        p.save(update_fields=['branch'])

    # Stock Intakes — scoped by who received them
    for s in StockIntake.objects.filter(branch__isnull=True).select_related('received_by'):
        s.branch = resolve_branch(s.received_by)
        s.save(update_fields=['branch'])

    # Restock Requests — scoped by who requested them
    for r in RestockRequest.objects.filter(branch__isnull=True).select_related('requested_by'):
        r.branch = resolve_branch(r.requested_by)
        r.save(update_fields=['branch'])


def reverse_migration(apps, schema_editor):
    """Simply clear branch assignments — the FK columns remain (nullable)."""
    Branch = apps.get_model('users', 'Branch')
    Branch.objects.filter(is_headquarters=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_add_branch_model'),
        ('inventory', '0007_add_branch_fks'),
    ]

    operations = [
        migrations.RunPython(create_default_branch, reverse_code=reverse_migration),
        migrations.RunPython(assign_inventory_records_to_branch, reverse_code=migrations.RunPython.noop),
    ]
