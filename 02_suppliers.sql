-- Expected rows: 17

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'suppliers'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'suppliers_name_unique'
    ) THEN
        ALTER TABLE suppliers
        ADD CONSTRAINT suppliers_name_unique UNIQUE (name);
    END IF;
END
$$;

INSERT INTO suppliers (
    name,
    contact_person,
    email,
    phone,
    address,
    is_active,
    balance,
    created_at,
    updated_at
) VALUES
    ('BELEA PHARMACY LTD', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('PHILMED LTD', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('TRANSWIDE', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('KENTONS LIMITED', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('Medisel KENYA LTD', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('Daima Chemists LTD', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('KINSEN', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('PHARMA ALLIED', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('MADAWA', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('NILA PHARMACEUTICALS', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('KENYA SEED COMPANY LIMITED', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('RONAK AGROVET LIMITED', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('AGRICHEM AFRICA LIMITED', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('JOJEMI EASTAFRICA LIMITED', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('SWAM WINES', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('AIVEO', '', '', '', '', TRUE, 0.00, NOW(), NOW()),
    ('SAWADH ENTERPRISES', '', '', '', '', TRUE, 0.00, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

SELECT COUNT(*) FROM suppliers;
