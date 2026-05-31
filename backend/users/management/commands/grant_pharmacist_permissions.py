"""Grant default operational flags to pharmacist/cashier users (one-time fix for existing rows)."""
from django.core.management.base import BaseCommand

from users.models import RoleChoices, User


class Command(BaseCommand):
    help = "Set can_process_sales and can_manage_inventory for pharmacists and cashiers."

    def handle(self, *args, **options):
        qs = User.objects.filter(
            role__in=[RoleChoices.PHARMACIST, RoleChoices.CASHIER],
            is_active=True,
        )
        updated = qs.update(can_process_sales=True, can_manage_inventory=True)
        self.stdout.write(self.style.SUCCESS(f"Updated {updated} pharmacist/cashier user(s)."))
