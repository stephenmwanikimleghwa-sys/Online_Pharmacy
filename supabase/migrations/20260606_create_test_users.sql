-- Create test users for authentication testing
-- Admin user: admin / admin123
-- Pharmacist user: pharmacist / pharmacist123

INSERT INTO users (
    id, password, last_login, is_superuser, username, first_name, last_name, 
    email, is_staff, is_active, date_joined, created_at, updated_at,
    role, is_verified, must_change_password, credit_balance, is_credit_customer,
    can_process_sales, can_manage_inventory, can_edit_prices, can_view_reports,
    can_view_financials, can_manage_users, can_delete_records, can_view_audit_logs,
    permission_flags
)
SELECT 
    12, 'pbkdf2_sha256$600000$ad2cxuDKXRNeCqbhI8nLM7$w9eHeL5f99X4Jkz/J4vEql/z2HDTW9Cqber6pPxB2A4=',
    NULL, true, 'admin', 'Admin', 'User', 'admin@pharmacy.local', true, true,
    NOW(), NOW(), NOW(),
    'ADMIN', true, false, 0, false,
    true, true, true, true, true, true, true, true,
    '{}' :: jsonb
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO users (
    id, password, last_login, is_superuser, username, first_name, last_name, 
    email, is_staff, is_active, date_joined, created_at, updated_at,
    role, is_verified, must_change_password, credit_balance, is_credit_customer,
    can_process_sales, can_manage_inventory, can_edit_prices, can_view_reports,
    can_view_financials, can_manage_users, can_delete_records, can_view_audit_logs,
    permission_flags
)
SELECT 
    13, 'pbkdf2_sha256$600000$zFXA0JEk666u5Du1hekvSe$FkVzQ2Dfxt3fTVvdzRKp/kvRDjcWHQP+ajEBszihrTE=',
    NULL, false, 'pharmacist', 'Pharmacist', 'User', 'pharmacist@pharmacy.local', true, true,
    NOW(), NOW(), NOW(),
    'PHARMACIST', true, false, 0, false,
    true, true, false, true, false, false, false, false,
    '{}' :: jsonb
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'pharmacist');
