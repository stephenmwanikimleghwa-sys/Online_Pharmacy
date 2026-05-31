-- Restore branch_stock rows for active branches from stock_intake history.
-- This replaces the temporary unitsofmeasure snapshot upsert, which can contain negative legacy branch values.

BEGIN;

DELETE FROM branch_stock
WHERE branch_id IN (
    SELECT id FROM branches WHERE name IN ('TRANSCOUNTY_MAIN', 'TRANSCOUNTY_ANNEX', 'PEAKFARM')
);

INSERT INTO branch_stock (product_id, branch_id, quantity, reorder_level, last_updated)
SELECT
    product_id,
    branch_id,
    SUM(quantity_received)::numeric,
    0,
    MAX(updated_at)
FROM stock_intake
WHERE branch_id IN (
    SELECT id FROM branches WHERE name IN ('TRANSCOUNTY_MAIN', 'TRANSCOUNTY_ANNEX', 'PEAKFARM')
)
GROUP BY product_id, branch_id;

COMMIT;
