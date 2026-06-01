-- Validation queries for Transcounty import

-- Total products imported from unitsofmeasure
SELECT COUNT(*) AS total_transcounty_products
FROM products p
WHERE p.pharmacy_id = (SELECT id FROM users_pharmacy WHERE name = 'Transcounty Pharmacy' LIMIT 1);

-- Per-branch: products with stock > 0, total rows, and sum of quantity
SELECT b.name AS branch, 
  SUM(CASE WHEN bs.quantity > 0 THEN 1 ELSE 0 END) AS products_with_stock_gt_0,
  COUNT(bs.*) AS total_branch_stock_rows,
  SUM(bs.quantity) AS sum_quantity
FROM branch_stock bs
JOIN users_branch b ON b.id = bs.branch_id
WHERE b.pharmacy_id = (SELECT id FROM users_pharmacy WHERE name = 'Transcounty Pharmacy' LIMIT 1)
GROUP BY b.name;

-- Pricing: missing BP/WP/RP
SELECT 
  SUM(CASE WHEN pt.buying_price IS NULL OR pt.buying_price = 0 THEN 1 ELSE 0 END) AS missing_bp,
  SUM(CASE WHEN pt.wholesale_price IS NULL OR pt.wholesale_price = 0 THEN 1 ELSE 0 END) AS missing_wp,
  SUM(CASE WHEN pt.retail_price IS NULL OR pt.retail_price = 0 THEN 1 ELSE 0 END) AS missing_rp
FROM pricing_tier pt
JOIN products p ON p.id = pt.product_id
WHERE p.pharmacy_id = (SELECT id FROM users_pharmacy WHERE name = 'Transcounty Pharmacy' LIMIT 1);

-- Pricing: count where wholesale deviates from buying * 1.10 by > 0.01
SELECT COUNT(*) AS mismatched_wholesale
FROM pricing_tier pt
JOIN products p ON p.id = pt.product_id
WHERE p.pharmacy_id = (SELECT id FROM users_pharmacy WHERE name = 'Transcounty Pharmacy' LIMIT 1)
  AND ABS(pt.wholesale_price - (pt.buying_price * 1.10)) > 0.01;

-- Unmatched legacy names in unitsofmeasure not present in products
SELECT u.name AS legacy_name
FROM unitsofmeasure u
LEFT JOIN products p ON UPPER(TRIM(u.name)) = UPPER(TRIM(p.name))
WHERE u.company = 'Transcounty'
  AND (p.id IS NULL OR p.pharmacy_id IS NULL);
