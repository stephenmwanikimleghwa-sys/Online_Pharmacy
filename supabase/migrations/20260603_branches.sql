-- Step 3: Create branch records
-- First ensure pharmacy exists
INSERT INTO public.pharmacies (name, address, contact_phone, license_number, is_active, created_at, updated_at)
SELECT 'Transcounty', 'Kitale, Kenya', '+254720246981', 'PHARMACY-MAIN-001', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pharmacies WHERE name = 'Transcounty');

-- Create branches
INSERT INTO public.branches (pharmacy_id, name, branch_type, address, contact_phone, license_number, is_active, is_headquarters, created_at, updated_at)
VALUES
  (1, 'TRANSCOUNTY_MAIN', 'CHEMIST', 'Kitale, Laini Moja', '+254720246981', 'BRANCH-MAIN-001', true, true, NOW(), NOW()),
  (1, 'TRANSCOUNTY_ANNEX', 'CHEMIST', 'Kitale, Bamila Building', '+254720246981', 'BRANCH-ANNEX-001', true, false, NOW(), NOW()),
  (1, 'PEAKFARM', 'AGROVET', 'Peakfarm, Kitale', '+254720246981', 'BRANCH-PEAK-001', true, false, NOW(), NOW())
ON CONFLICT(name) DO NOTHING;
