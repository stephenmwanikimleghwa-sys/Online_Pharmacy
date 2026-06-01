from decimal import Decimal
from django.test import TestCase

from users.models import Pharmacy, Branch
from products.models import Product, PricingTier, BranchStock


class LegacyPricingTests(TestCase):
    def test_pricing_tier_preserves_legacy_prices_when_locked(self):
        pharmacy = Pharmacy.objects.create(name='Transcounty Pharmacy')
        product = Product.objects.create(name='TEST PROD', price=Decimal('0.00'), pharmacy=pharmacy)

        pt = PricingTier(
            product=product,
            buying_price=Decimal('10.00'),
            wholesale_price=Decimal('12.34'),
            retail_price=Decimal('18.90'),
            use_legacy_prices=True,
        )
        pt.save()

        self.assertEqual(pt.wholesale_price, Decimal('12.34'))
        self.assertEqual(pt.retail_price, Decimal('18.90'))
        # product.price should be set to retail price
        product.refresh_from_db()
        self.assertEqual(product.price, Decimal('18.90'))


class BranchStockIsolationTests(TestCase):
    def test_branch_quantity_isolated_between_branches(self):
        pharmacy = Pharmacy.objects.create(name='Transcounty Pharmacy')
        b1 = Branch.objects.create(pharmacy=pharmacy, name='Transcounty Main')
        b2 = Branch.objects.create(pharmacy=pharmacy, name='Transcounty Annex')
        product = Product.objects.create(name='ISO PROD', price=Decimal('5.00'), pharmacy=pharmacy)

        bs1 = BranchStock.objects.create(product=product, branch=b1, quantity=Decimal('10'))
        bs2 = BranchStock.objects.create(product=product, branch=b2, quantity=Decimal('0'))

        # change bs1 and ensure bs2 unchanged
        bs1.quantity = Decimal('7')
        bs1.save()
        bs2.refresh_from_db()
        self.assertEqual(bs2.quantity, Decimal('0'))
