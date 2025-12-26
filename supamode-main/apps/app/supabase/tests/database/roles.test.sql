-- Test file: test_roles_operations.sql
-- Tests actual CRUD operations on supamode.roles table
-- This tests role management through RLS policies and business rules

BEGIN;
CREATE EXTENSION "basejump-supabase_test_helpers" VERSION '0.0.6';

SELECT no_plan();

-- Clean up any existing test data
DELETE FROM supamode.permission_groups;
DELETE FROM supamode.account_roles;
DELETE FROM supamode.role_permissions;
-- Clean up dashboard tables (must be in dependency order)
DELETE FROM supamode.dashboard_role_shares;
DELETE FROM supamode.dashboard_widgets;
DELETE FROM supamode.dashboards;
DELETE FROM supamode.accounts;
DELETE FROM supamode.roles;
DELETE FROM supamode.permissions;

-- Create test users
SELECT kit.create_supabase_user(kit.test_uuid(1), 'super_admin', 'superadmin@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(2), 'manager', 'manager@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'regular_user', 'user@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
    (kit.test_uuid(101), kit.test_uuid(1), true),  -- Super Admin account
    (kit.test_uuid(102), kit.test_uuid(2), true),  -- Manager account  
    (kit.test_uuid(103), kit.test_uuid(3), true);  -- Regular User account

-- Create initial roles with different priorities
INSERT INTO supamode.roles (id, name, rank, description) VALUES
    (kit.test_uuid(201), 'Super Admin', 100, 'Highest rank role'),
    (kit.test_uuid(202), 'Manager', 50, 'Mid-level management role'),
    (kit.test_uuid(203), 'User', 20, 'Standard user role');

-- Create system permissions for role management
INSERT INTO supamode.permissions (id, name, permission_type, system_resource, action) VALUES
    (kit.test_uuid(301), 'role_insert', 'system', 'role', 'insert'),
    (kit.test_uuid(302), 'role_update', 'system', 'role', 'update'),
    (kit.test_uuid(303), 'role_delete', 'system', 'role', 'delete'),
    (kit.test_uuid(304), 'role_select', 'system', 'role', 'select');

-- Assign roles to accounts
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(201)),  -- Super Admin
    (kit.test_uuid(102), kit.test_uuid(202)),  -- Manager
    (kit.test_uuid(103), kit.test_uuid(203));  -- User

-- Grant permissions to roles
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    -- Super Admin gets all role permissions
    (kit.test_uuid(201), kit.test_uuid(301)),
    (kit.test_uuid(201), kit.test_uuid(302)),
    (kit.test_uuid(201), kit.test_uuid(303)),
    (kit.test_uuid(201), kit.test_uuid(304)),
    -- Manager gets insert/update/delete/select permissions  
    (kit.test_uuid(202), kit.test_uuid(301)),
    (kit.test_uuid(202), kit.test_uuid(302)),
    (kit.test_uuid(202), kit.test_uuid(303)),
    (kit.test_uuid(202), kit.test_uuid(304));

-- Test 1: Unauthenticated user cannot view roles
SET ROLE anon;

SELECT throws_ok(
    $$ SELECT * FROM supamode.roles $$,
    'permission denied for schema supamode'
);

-- Test 2: Authenticated user with admin access can view all roles
SELECT kit.authenticate_as('regular_user');

SELECT isnt_empty(
    $$ SELECT * FROM supamode.roles $$,
    'Authenticated user with admin access can view roles'
);

-- Test 3: User without admin access cannot view roles  
SELECT kit.set_admin_access('user@test.com', 'false');

SELECT is_empty(
    $$ SELECT * FROM supamode.roles $$,
    'User without admin access cannot view roles'
);

-- Restore admin access
SELECT kit.set_admin_access('user@test.com', 'true');

-- Test 4: User without role permissions cannot create roles
SELECT throws_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
    VALUES (kit.test_uuid(210), 'New Role', 10, 'Test role') $$,
    'new row violates row-level security policy for table "roles"',
    'User without role insert permission cannot create roles'
);

-- Test 5: Super Admin can create new roles with lower rank
SELECT kit.authenticate_as('super_admin');

INSERT INTO supamode.roles (id, name, rank, description) 
VALUES (kit.test_uuid(210), 'Guest Role', 10, 'Lowest rank role');

SELECT row_eq(
    $$ SELECT name, rank FROM supamode.roles WHERE id = kit.test_uuid(210) $$,
    ROW('Guest Role'::varchar, 10),
    'Super Admin can create roles with lower rank'
);

-- Test 6: Cannot create role with rank equal to own max rank
SELECT throws_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
    VALUES (kit.test_uuid(211), 'Equal rank', 100, 'Same as super admin') $$,
    'new row violates row-level security policy for table "roles"',
    'Cannot create role with rank equal to own max rank'
);

-- Test 7: Cannot create role with rank higher than own max rank  
SELECT throws_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
    VALUES (kit.test_uuid(212), 'Higher rank', 110, 'Higher than super admin') $$,
    'new row violates row-level security policy for table "roles"',
    'Cannot create role with rank higher than own max rank'
);

-- Test 8: rank must be unique - duplicate rank fails
SELECT throws_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
    VALUES (kit.test_uuid(213), 'Duplicate rank', 10, 'Same rank as Guest Role') $$,
    'duplicate key value violates unique constraint "roles_rank_unique"',
    'Cannot create role with duplicate rank'
);

-- Test 9: Manager can create roles with lower rank than their own
SELECT kit.authenticate_as('manager');

SELECT lives_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
       VALUES (kit.test_uuid(214), 'Trainee', 15, 'Lower than manager rank') $$,
    'Manager can create roles with lower rank'
);

SELECT row_eq(
    $$ SELECT name, rank FROM supamode.roles WHERE id = kit.test_uuid(214) $$,
    ROW('Trainee'::varchar, 15),
    'Trainee role was created successfully'
);

-- Test 10: Manager cannot create roles with equal or higher rank
SELECT throws_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
       VALUES (kit.test_uuid(215), 'Senior Manager', 50, 'Equal to manager rank') $$,
    'new row violates row-level security policy for table "roles"',
    'Manager cannot create role with equal rank to own'
);

SELECT is_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(215) $$,
    'Senior Manager role was not created'
);

SELECT throws_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
       VALUES (kit.test_uuid(216), 'Director', 80, 'Higher than manager rank') $$,
    'new row violates row-level security policy for table "roles"',
    'Manager cannot create role with higher rank than own'
);

SELECT is_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(216) $$,
    'Director role was not created'
);

-- Test 11: Super Admin can update any lower rank role
SELECT kit.authenticate_as('super_admin');

UPDATE supamode.roles 
SET description = 'Updated by super admin' 
WHERE id = kit.test_uuid(202);

SELECT row_eq(
    $$ SELECT description FROM supamode.roles WHERE id = kit.test_uuid(202) $$,
    ROW('Updated by super admin'::varchar),
    'Super Admin can update lower rank roles'
);

-- Test 12: Manager can update lower rank roles
SELECT kit.authenticate_as('manager');

UPDATE supamode.roles 
SET description = 'Updated by manager' 
WHERE id = kit.test_uuid(214);

SELECT row_eq(
    $$ SELECT description FROM supamode.roles WHERE id = kit.test_uuid(214) $$,
    ROW('Updated by manager'::varchar),
    'Manager can update lower rank roles'
);

-- Test 13: Manager cannot update higher rank roles
UPDATE supamode.roles 
SET description = 'Hacked by manager' 
WHERE id = kit.test_uuid(201);

SELECT row_eq(
    $$ SELECT description FROM supamode.roles WHERE id = kit.test_uuid(201) $$,
    ROW('Highest rank role'::varchar),
    'Manager cannot update Super Admin role (no change occurred)'
);

-- Test 14: Manager cannot update equal rank roles (their own role)
UPDATE supamode.roles 
SET description = 'Self-updated' 
WHERE id = kit.test_uuid(202);

SELECT row_eq(
    $$ SELECT description FROM supamode.roles WHERE id = kit.test_uuid(202) $$,
    ROW('Updated by super admin'::varchar),
    'Manager cannot update their own role (no change occurred)'
);

-- Test 15: Cannot update role rank to value >= own max rank
SELECT kit.authenticate_as('super_admin');

select throws_ok(
    $$ UPDATE supamode.roles 
       SET rank = 100
       WHERE id = kit.test_uuid(214) $$,
    'Cannot modify a role with a rank higher than or equal to your maximum role rank (100). Your max rank: 100, Role rank: 100'
);

SELECT row_eq(
    $$ SELECT rank FROM supamode.roles WHERE id = kit.test_uuid(214) $$,
    ROW(15),
    'Cannot update role rank to high value (no change occurred)'
);

-- Test 16: Super Admin can delete lower rank roles
DELETE FROM supamode.roles WHERE id = kit.test_uuid(214);

SELECT is_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(214) $$,
    'Super Admin can delete lower rank roles'
);

-- Test 17: Manager cannot delete higher rank roles
SELECT kit.authenticate_as('manager');

DELETE FROM supamode.roles WHERE id = kit.test_uuid(201);

SELECT isnt_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(201) $$,
    'Manager cannot delete Super Admin role (role still exists)'
);

-- Test 18: Cannot delete role you currently have assigned
DELETE FROM supamode.roles WHERE id = kit.test_uuid(202);

SELECT isnt_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(202) $$,
    'Manager cannot delete their own assigned role (role still exists)'
);

-- Test 19: Can delete role after it's no longer assigned to you
SELECT kit.authenticate_as('super_admin');

-- Remove manager's role assignment
DELETE FROM supamode.account_roles 
WHERE account_id = kit.test_uuid(102) AND role_id = kit.test_uuid(202);

-- Now manager (who no longer has that role) should not be able to delete it
SELECT kit.authenticate_as('manager');

DELETE FROM supamode.roles WHERE id = kit.test_uuid(202);

SELECT isnt_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(202) $$,
    'User without roles cannot delete any roles (role still exists)'
);

-- Test 20: Super Admin can delete the role after removing assignment
SELECT kit.authenticate_as('super_admin');

DELETE FROM supamode.roles WHERE id = kit.test_uuid(202);

SELECT is_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(202) $$,
    'Super Admin can delete role after removing assignments'
);

-- Test 21: Role deletion cascades properly (verify no orphaned assignments)
-- First create a test role and assign it
SELECT lives_ok(
    $$ UPDATE supamode.roles 
       SET rank = 5
       WHERE id = kit.test_uuid(220) $$,
    'Test role created successfully'
);

set role postgres;

-- Create new user
SELECT kit.create_supabase_user(kit.test_uuid(4), 'test_user', 'test_user@test.com');

-- Create Role
SELECT lives_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
       VALUES (kit.test_uuid(220), 'Test Delete', 5, 'Will be deleted') $$,
    'Test role created successfully'
);

-- Delete the role
DELETE FROM supamode.roles WHERE id = kit.test_uuid(220);

SELECT is_empty(
    $$ SELECT * FROM supamode.account_roles WHERE role_id = kit.test_uuid(220) $$,
    'Role deletion cascades to remove account assignments'
);

-- Test 22: Name uniqueness constraint
SELECT throws_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
       VALUES (kit.test_uuid(221), 'User', 25, 'Duplicate name') $$,
    'duplicate key value violates unique constraint "roles_name_key"',
    'Cannot create role with duplicate name'
);

SELECT is_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(221) $$,
    'Role with duplicate name was not created'
);

SELECT finish();

ROLLBACK;