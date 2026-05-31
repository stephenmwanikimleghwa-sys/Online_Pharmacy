-- Create any unmatched legacy suppliers referenced by legacy_purchases.

INSERT INTO suppliers (name, contact_person, email, phone, address, is_active, balance, created_at, updated_at)
SELECT DISTINCT trim(lp.supplier), NULL, NULL, NULL, NULL, TRUE, 0, NOW(), NOW()
FROM legacy_purchases lp
WHERE lp.supplier IS NOT NULL
  AND trim(lp.supplier) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM suppliers s
      WHERE trim(upper(s.name)) = trim(upper(lp.supplier))
  );
