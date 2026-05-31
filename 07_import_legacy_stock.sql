-- Import legacy purchases into stock_intake and branch_stock.
-- Requires legacy_purchases to be loaded from 06_legacy_purchases.pg.sql.

BEGIN;

INSERT INTO suppliers (name, contact_person, email, phone, address, is_active, balance, created_at, updated_at)
SELECT DISTINCT trim(lp.supplier), NULL, NULL, NULL, NULL, TRUE, 0, NOW(), NOW()
FROM legacy_purchases lp
WHERE lp.supplier IS NOT NULL
  AND trim(lp.supplier) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM suppliers s
      WHERE trim(upper(s.name)) = trim(upper(lp.supplier))
  );

INSERT INTO suppliers (name, contact_person, email, phone, address, is_active, balance, created_at, updated_at)
SELECT 'LEGACY UNKNOWN', NULL, NULL, NULL, NULL, TRUE, 0, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM suppliers WHERE upper(trim(name)) = 'LEGACY UNKNOWN'
);

WITH supplier_map AS (
    SELECT
        lp.*,
        p.id AS product_id,
        COALESCE(s.id, u.id) AS supplier_id
    FROM legacy_purchases lp
    LEFT JOIN products p ON trim(upper(p.name)) = trim(upper(lp.name))
    LEFT JOIN suppliers s ON trim(upper(s.name)) = trim(upper(lp.supplier))
    CROSS JOIN LATERAL (
        SELECT id FROM suppliers WHERE upper(trim(name)) = 'LEGACY UNKNOWN' LIMIT 1
    ) u
),
branch_ids AS (
    SELECT name AS branch_key, id AS branch_id
    FROM branches
    WHERE name IN ('TRANSCOUNTY_MAIN', 'TRANSCOUNTY_ANNEX', 'PEAKFARM')
),
stock_rows AS (
    SELECT
        pm.product_id,
        pm.supplier_id,
        pm.name,
        pm.costperunit,
        pm.expirydate,
        pm.receiptno,
        pm.systemdate,
        pm.addedby,
        pm.paymentmode,
        pm.paymentstatus,
        pm.TRANSCOUNTY_MAIN AS TRANSCOUNTY_MAIN,
        pm.TRANSCOUNTY_ANNEX AS TRANSCOUNTY_ANNEX,
        pm.PEAKFARM AS PEAKFARM
    FROM supplier_map pm
    WHERE pm.product_id IS NOT NULL
      AND pm.supplier_id IS NOT NULL
),
branch_rows AS (
    SELECT product_id, supplier_id, costperunit, expirydate, receiptno, systemdate, addedby, paymentmode, paymentstatus, 'TRANSCOUNTY_MAIN' AS branch_key, TRANSCOUNTY_MAIN AS quantity
    FROM stock_rows WHERE COALESCE(TRANSCOUNTY_MAIN, 0) <> 0
    UNION ALL
    SELECT product_id, supplier_id, costperunit, expirydate, receiptno, systemdate, addedby, paymentmode, paymentstatus, 'TRANSCOUNTY_ANNEX' AS branch_key, TRANSCOUNTY_ANNEX AS quantity
    FROM stock_rows WHERE COALESCE(TRANSCOUNTY_ANNEX, 0) <> 0
    UNION ALL
    SELECT product_id, supplier_id, costperunit, expirydate, receiptno, systemdate, addedby, paymentmode, paymentstatus, 'PEAKFARM' AS branch_key, PEAKFARM AS quantity
    FROM stock_rows WHERE COALESCE(PEAKFARM, 0) <> 0
),
stock_intake_rows AS (
    SELECT
        br.product_id,
        br.supplier_id,
        br.branch_id,
        br.quantity::integer AS quantity_received,
        COALESCE(br.costperunit, 0)::numeric AS unit_cost,
        (COALESCE(br.quantity, 0) * COALESCE(br.costperunit, 0))::numeric AS total_cost,
        CASE
            WHEN br.expirydate IS NOT NULL
                 AND br.expirydate <> '0000-00-00'
                 AND br.expirydate ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN br.expirydate::date
            ELSE NULL
        END AS expiry_date,
        NULL::text AS batch_number,
        CASE
            WHEN br.systemdate IS NOT NULL
                 AND br.systemdate <> '0000-00-00'
                 AND br.systemdate ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN br.systemdate::timestamp
            ELSE NOW()
        END AS received_date,
        concat_ws(' | ', NULLIF(br.addedby, ''), NULLIF(br.paymentmode, ''), NULLIF(br.paymentstatus, '')) AS notes,
        NOW() AS created_at,
        NOW() AS updated_at,
        NULL::bigint AS received_by_id,
        br.receiptno AS invoice_number,
        CASE
            WHEN upper(br.paymentmode) LIKE '%CREDIT%' OR upper(br.paymentstatus) LIKE '%CREDIT%' THEN 'CREDIT'
            ELSE 'PAID'
        END AS payment_status
    FROM (
        SELECT br.*, bi.branch_id
        FROM branch_rows br
        JOIN branch_ids bi ON br.branch_key = bi.branch_key
    ) br
),
stock_intake_insert AS (
    INSERT INTO stock_intake (
        quantity_received,
        unit_cost,
        total_cost,
        expiry_date,
        batch_number,
        received_date,
        notes,
        created_at,
        updated_at,
        product_id,
        received_by_id,
        branch_id,
        invoice_number,
        payment_status,
        supplier_id
    )
    SELECT
        quantity_received,
        unit_cost,
        total_cost,
        expiry_date,
        batch_number,
        received_date,
        notes,
        created_at,
        updated_at,
        product_id,
        received_by_id,
        branch_id,
        invoice_number,
        payment_status,
        supplier_id
    FROM stock_intake_rows
    RETURNING product_id, branch_id, quantity_received
)
INSERT INTO branch_stock (product_id, branch_id, quantity, reorder_level, last_updated)
SELECT product_id, branch_id, SUM(quantity_received)::numeric, 0, NOW()
FROM stock_intake_insert
GROUP BY product_id, branch_id
ON CONFLICT (product_id, branch_id) DO UPDATE
SET quantity = EXCLUDED.quantity,
    last_updated = EXCLUDED.last_updated;

-- Diagnostics: unmatched legacy products and suppliers
SELECT upper(trim(lp.name)) AS missing_product_name, count(*) AS row_count
FROM legacy_purchases lp
LEFT JOIN products p ON trim(upper(p.name)) = trim(upper(lp.name))
WHERE p.id IS NULL
GROUP BY upper(trim(lp.name))
ORDER BY row_count DESC
LIMIT 100;

SELECT upper(trim(lp.supplier)) AS missing_supplier_name, count(*) AS row_count
FROM legacy_purchases lp
LEFT JOIN suppliers s ON trim(upper(s.name)) = trim(upper(lp.supplier))
WHERE s.id IS NULL
GROUP BY upper(trim(lp.supplier))
ORDER BY row_count DESC
LIMIT 100;

COMMIT;
