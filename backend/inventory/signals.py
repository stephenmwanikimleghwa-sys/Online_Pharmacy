from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache

from inventory.models.stock_intake import StockIntake
from inventory.models.dispensing import Dispensation
from inventory.models.supplier import Supplier
from users.models import Branch


def _clear_branch_dashboard_cache(branch_id):
    if not branch_id:
        return
    cache.delete(f"stock_valuation_{branch_id}")
    cache.delete(f"low_stock_{branch_id}")
    cache.delete(f"dashboard_branch_{branch_id}")
    cache.delete(f"expiry_alerts_{branch_id}")
    cache.delete(f"inventory_summary_branch_{branch_id}")


def _clear_global_dashboard_cache(branch_id):
    """Invalidate the pharmacy-scoped global-overview caches for this branch.

    The global-overview cache is keyed per pharmacy scope
    (dashboard_global_pharmacy_<id>) plus the superuser view
    (dashboard_global_super). A branch change affects the superuser view and the
    view for that branch's pharmacy, so clear both. The 60s TTL bounds any key
    we can't resolve here.
    """
    cache.delete("dashboard_global_super")
    if not branch_id:
        return
    # Resolve the branch's pharmacy without importing the model at top level
    # (avoids a circular import with users.models).
    pharmacy_id = (
        Branch.objects.filter(pk=branch_id)
        .values_list("pharmacy_id", flat=True)
        .first()
    )
    if pharmacy_id:
        cache.delete(f"dashboard_global_pharmacy_{pharmacy_id}")
    cache.delete("dashboard_global_pharmacy_none")


@receiver(post_save, sender=StockIntake)
def clear_stock_cache_on_intake(sender, instance, **kwargs):
    branch_id = instance.branch_id
    _clear_branch_dashboard_cache(branch_id)
    _clear_global_dashboard_cache(branch_id)
    cache.delete("suppliers_list")


@receiver(post_save, sender=Dispensation)
def clear_sale_cache_on_dispensation(sender, instance, **kwargs):
    branch_id = instance.branch_id
    if branch_id:
        cache.delete(f"low_stock_{branch_id}")
        _clear_branch_dashboard_cache(branch_id)
    _clear_global_dashboard_cache(branch_id)


@receiver(post_save, sender=Supplier)
def clear_supplier_cache(sender, instance, **kwargs):
    cache.delete("suppliers_list")
    cache.delete(f"supplier_detail_{instance.id}")
