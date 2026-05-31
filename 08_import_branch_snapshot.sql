-- WARNING: legacy unitsofmeasure branch snapshot contains invalid negative quantities and is not a reliable source for branch_stock.
-- The annex column has only a single positive row and the legacy snapshot can corrupt existing branch balances.
-- Use stock_intake history for branch stock reconstruction instead.
-- Upsert branch stock snapshot from unitsofmeasure branch counts.
-- This fills TRANSCOUNTY_MAIN, TRANSCOUNTY_ANNEX, and PEAKFARM branch stock from the legacy product snapshot.

BEGIN;

WITH branch_ids AS (
    SELECT name AS branch_key, id AS branch_id
    FROM branches
    WHERE name IN ('TRANSCOUNTY_MAIN', 'TRANSCOUNTY_ANNEX', 'PEAKFARM')
),
product_map AS (
    SELECT DISTINCT ON (trim(upper(u.name)))
        u.serialnumber,
        u.name AS legacy_name,
        p.id AS product_id,
        u.TRANSCOUNTY_MAIN,
        u.TRANSCOUNTY_ANNEX,
        u.PEAKFARM
    FROM unitsofmeasure u
    JOIN (
        SELECT DISTINCT ON (trim(upper(name))) id, name
        FROM products
        ORDER BY trim(upper(name)), id
    ) p ON trim(upper(p.name)) = trim(upper(u.name))
)
INSERT INTO branch_stock (product_id, branch_id, quantity, reorder_level, last_updated)
SELECT
    um.product_id,
    bi.branch_id,
    CASE bi.branch_key
        WHEN 'TRANSCOUNTY_MAIN' THEN COALESCE(um.TRANSCOUNTY_MAIN, 0)::numeric
        WHEN 'TRANSCOUNTY_ANNEX' THEN COALESCE(um.TRANSCOUNTY_ANNEX, 0)::numeric
        WHEN 'PEAKFARM' THEN COALESCE(um.PEAKFARM, 0)::numeric
        ELSE 0
    END,
    0,
    NOW()
FROM product_map um
JOIN branch_ids bi ON bi.branch_key IN ('TRANSCOUNTY_MAIN', 'TRANSCOUNTY_ANNEX', 'PEAKFARM')
WHERE (bi.branch_key = 'TRANSCOUNTY_MAIN' AND COALESCE(um.TRANSCOUNTY_MAIN, 0) <> 0)
   OR (bi.branch_key = 'TRANSCOUNTY_ANNEX' AND COALESCE(um.TRANSCOUNTY_ANNEX, 0) <> 0)
   OR (bi.branch_key = 'PEAKFARM' AND COALESCE(um.PEAKFARM, 0) <> 0)
ON CONFLICT (product_id, branch_id) DO UPDATE
SET quantity = EXCLUDED.quantity,
    last_updated = EXCLUDED.last_updated;

-- Diagnostics: legacy products without a product mapping
SELECT COUNT(*) AS unmatched_unitsofmeasure_products
FROM unitsofmeasure u
LEFT JOIN products p ON trim(upper(p.name)) = trim(upper(u.name))
WHERE p.id IS NULL;

COMMIT;
