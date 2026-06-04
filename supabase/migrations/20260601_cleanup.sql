-- Step 1: Clear all related data for pharmacy_id = 1 in correct dependency order
-- Delete from all dependent tables in order
DELETE FROM public.order_items WHERE product_id IN (
  SELECT id FROM public.products WHERE pharmacy_id = 1
);

DELETE FROM public.dispensing_logs WHERE product_id IN (
  SELECT id FROM public.products WHERE pharmacy_id = 1
);

DELETE FROM public.pricing_tier WHERE product_id IN (
  SELECT id FROM public.products WHERE pharmacy_id = 1
);

DELETE FROM public.stock_logs WHERE product_id IN (
  SELECT id FROM public.products WHERE pharmacy_id = 1
);

DELETE FROM public.stock_intake WHERE product_id IN (
  SELECT id FROM public.products WHERE pharmacy_id = 1
);

DELETE FROM public.reviews WHERE product_id IN (
  SELECT id FROM public.products WHERE pharmacy_id = 1
);

DELETE FROM public.branch_stock WHERE product_id IN (
  SELECT id FROM public.products WHERE pharmacy_id = 1
);

-- Finally delete products
DELETE FROM public.products WHERE pharmacy_id = 1;

-- Step 2: Create or ensure pharmacy exists
INSERT INTO public.pharmacies (name, address, contact_phone, license_number, is_active, created_at, updated_at)
SELECT 'Transcounty', 'Kitale, Kenya', '+254720246981', 'PHARMACY-MAIN-001', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pharmacies WHERE name = 'Transcounty');

-- Migration complete
