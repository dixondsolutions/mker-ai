-- ==============================================================================
-- Admin User Setup Script
-- ==============================================================================
-- Run this script after deployment to create an admin user for Supamode
--
-- Usage (replace with your admin email):
-- psql "postgresql://postgres:PASSWORD@localhost:54322/postgres" -f setup-admin.sql -v admin_email="'admin@example.com'"
--
-- Or manually edit the @admin_email variable below:
-- ==============================================================================

-- Set the admin email (change this!)
\set admin_email 'admin@example.com'

-- ==============================================================================
-- Step 1: Grant Supamode access to the user
-- ==============================================================================
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"supamode_access": "true"}'::jsonb
WHERE email = :'admin_email';

-- ==============================================================================
-- Step 2: Create Supamode account for the user
-- ==============================================================================
INSERT INTO supamode.accounts (auth_user_id, metadata, preferences)
SELECT 
    id,
    jsonb_build_object('email', email, 'username', split_part(email, '@', 1)),
    '{"language": "en-US", "timezone": "UTC"}'::jsonb
FROM auth.users 
WHERE email = :'admin_email'
ON CONFLICT (auth_user_id) DO NOTHING;

-- ==============================================================================
-- Step 3: Assign the Root role to the user
-- ==============================================================================
INSERT INTO supamode.account_roles (account_id, role_id)
SELECT a.id, r.id
FROM supamode.accounts a, supamode.roles r
WHERE a.auth_user_id = (SELECT id FROM auth.users WHERE email = :'admin_email')
  AND r.name = 'Root'
ON CONFLICT (account_id, role_id) DO NOTHING;

-- ==============================================================================
-- Step 4: Create Full Admin permission group if not exists
-- ==============================================================================
INSERT INTO supamode.permission_groups (name, description)
VALUES ('Full Admin', 'Full administrative access to all system resources')
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- Step 5: Add all permissions to Full Admin group
-- ==============================================================================
INSERT INTO supamode.permission_group_permissions (group_id, permission_id)
SELECT pg.id, p.id
FROM supamode.permission_groups pg, supamode.permissions p
WHERE pg.name = 'Full Admin'
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- ==============================================================================
-- Step 6: Link Full Admin group to Root role
-- ==============================================================================
INSERT INTO supamode.role_permission_groups (role_id, group_id)
SELECT r.id, pg.id
FROM supamode.roles r, supamode.permission_groups pg
WHERE r.name = 'Root' AND pg.name = 'Full Admin'
ON CONFLICT (role_id, group_id) DO NOTHING;

-- ==============================================================================
-- Verification
-- ==============================================================================
SELECT 
    u.email,
    a.id as supamode_account_id,
    r.name as role_name,
    u.raw_app_meta_data->>'supamode_access' as supamode_access
FROM auth.users u
LEFT JOIN supamode.accounts a ON a.auth_user_id = u.id
LEFT JOIN supamode.account_roles ar ON ar.account_id = a.id
LEFT JOIN supamode.roles r ON r.id = ar.role_id
WHERE u.email = :'admin_email';


