-- Expected rows: 3

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'branches'
          AND constraint_type = 'UNIQUE'
          AND constraint_name = 'branches_name_unique'
    ) THEN
        ALTER TABLE branches
        ADD CONSTRAINT branches_name_unique UNIQUE (name);
    END IF;
END
$$;

INSERT INTO branches (
    pharmacy_id,
    name,
    address,
    contact_phone,
    license_number,
    is_active,
    is_headquarters,
    created_at,
    updated_at
) VALUES
    (
        1,
        'TRANSCOUNTY_MAIN',
        '',
        '',
        '',
        TRUE,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        1,
        'TRANSCOUNTY_ANNEX',
        '',
        '',
        '',
        TRUE,
        FALSE,
        NOW(),
        NOW()
    ),
    (
        1,
        'PEAKFARM',
        '',
        '',
        '',
        TRUE,
        FALSE,
        NOW(),
        NOW()
    )
ON CONFLICT (name) DO NOTHING;

SELECT COUNT(*) FROM branches;
