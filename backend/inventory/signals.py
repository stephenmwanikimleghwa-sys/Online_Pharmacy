from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache

from inventory.models.stock_intake import StockIntake
from inventory.models.dispensing import Dispensation
from inventory.models.supplier import Supplier


def _clear_branch_dashboard_cache(branch_id):
    if not branch_id:
        return
    cache.delete(f"stock_valuation_{branch_id}")
    cache.delete(f"low_stock_{branch_id}")
    cache.delete(f"dashboard_branch_{branch_id}")
    cache.delete(f"expiry_alerts_{branch_id}")


@receiver(post_save, sender=StockIntake)
def clear_stock_cache_on_intake(sender, instance, **kwargs):
    branch_id = instance.branch_id
    _clear_branch_dashboard_cache(branch_id)
    cache.delete("dashboard_global")
    cache.delete("suppliers_list")


@receiver(post_save, sender=Dispensation)
def clear_sale_cache_on_dispensation(sender, instance, **kwargs):
    branch_id = instance.branch_id
    if branch_id:
        cache.delete(f"low_stock_{branch_id}")
        _clear_branch_dashboard_cache(branch_id)
    cache.delete("dashboard_global")


@receiver(post_save, sender=Supplier)
def clear_supplier_cache(sender, instance, **kwargs):
    cache.delete("suppliers_list")
    cache.delete(f"supplier_detail_{instance.id}")
