-- Test file: has_data_permission.test.sql
-- Tests supamode.has_data_permission function through actual operations
-- This tests data permission management through RLS policies and business rules

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
SELECT kit.create_supabase_user(kit.test_uuid(1), 'data_admin', 'dataadmin@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(2), 'table_user', 'tableuser@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'no_permission_user', 'noperm@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(4), 'schema_user', 'schemauser@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
    (kit.test_uuid(101), kit.test_uuid(1), true),  -- Data Admin account
    (kit.test_uuid(102), kit.test_uuid(2), true),  -- Table User account  
    (kit.test_uuid(103), kit.test_uuid(3), true),  -- No Permission User account
    (kit.test_uuid(104), kit.test_uuid(4), true);  -- Schema User account

-- Create roles with different priorities
INSERT INTO supamode.roles (id, name, rank, description) VALUES
    (kit.test_uuid(201), 'Data Admin', 90, 'Data administration role'),
    (kit.test_uuid(202), 'Table User', 30, 'Table-level access role'),
    (kit.test_uuid(203), 'No Permissions', 10, 'Role with no data permissions'),
    (kit.test_uuid(204), 'Schema User', 40, 'Schema-level access role');

-- Create data permissions for testing
INSERT INTO supamode.permissions (id, name, permission_type, scope, schema_name, table_name, action) VALUES
    -- Table-level permissions
    (kit.test_uuid(301), 'public_users_select', 'data', 'table', 'public', 'users', 'select'),
    (kit.test_uuid(302), 'public_users_insert', 'data', 'table', 'public', 'users', 'insert'),
    (kit.test_uuid(303), 'public_users_update', 'data', 'table', 'public', 'users', 'update'),
    (kit.test_uuid(304), 'public_users_delete', 'data', 'table', 'public', 'users', 'delete'),
    (kit.test_uuid(305), 'public_products_select', 'data', 'table', 'public', 'products', 'select'),
    -- Wildcard permissions
    (kit.test_uuid(306), 'public_all_tables_select', 'data', 'table', 'public', '*', 'select'),
    (kit.test_uuid(307), 'all_schemas_users_select', 'data', 'table', '*', 'users', 'select'),
    (kit.test_uuid(308), 'all_all_select', 'data', 'table', '*', '*', 'select'),
    -- Wildcard action
    (kit.test_uuid(309), 'public_orders_all', 'data', 'table', 'public', 'orders', '*');

-- Assign roles to accounts
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(201)),  -- Data Admin
    (kit.test_uuid(102), kit.test_uuid(202)),  -- Table User
    (kit.test_uuid(103), kit.test_uuid(203)),  -- No Permissions User
    (kit.test_uuid(104), kit.test_uuid(204));  -- Schema User

-- Grant permissions to roles
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    -- Data Admin gets comprehensive permissions
    (kit.test_uuid(201), kit.test_uuid(301)),  -- public.users select
    (kit.test_uuid(201), kit.test_uuid(302)),  -- public.users insert
    (kit.test_uuid(201), kit.test_uuid(303)),  -- public.users update
    (kit.test_uuid(201), kit.test_uuid(304)),  -- public.users delete
    (kit.test_uuid(201), kit.test_uuid(305)),  -- public.products select
    (kit.test_uuid(201), kit.test_uuid(309)),  -- public.orders all actions
    -- Table User gets limited permissions
    (kit.test_uuid(202), kit.test_uuid(301)),  -- public.users select only
    (kit.test_uuid(202), kit.test_uuid(305)),  -- public.products select only
    -- Schema User gets wildcard permissions  
    (kit.test_uuid(204), kit.test_uuid(306)),  -- public.* select
    (kit.test_uuid(204), kit.test_uuid(307));  -- *.users select

-- Test 1: User without admin access cannot use has_data_permission
SELECT kit.authenticate_as('no_permission_user');
SELECT kit.set_admin_access('noperm@test.com', 'false');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'users')),
    false,
    'User without admin access cannot use has_data_permission'
);

-- Restore admin access for remaining tests
SELECT kit.set_admin_access('noperm@test.com', 'true');

-- Test 2: Data Admin can access tables they have permission for
SELECT kit.authenticate_as('data_admin');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'users')),
    true,
    'Data Admin can select from public.users'
);

SELECT is(
    (SELECT supamode.has_data_permission('insert'::supamode.system_action, 'public', 'users')),
    true,
    'Data Admin can insert into public.users'
);

SELECT is(
    (SELECT supamode.has_data_permission('update'::supamode.system_action, 'public', 'users')),
    true,
    'Data Admin can update public.users'
);

SELECT is(
    (SELECT supamode.has_data_permission('delete'::supamode.system_action, 'public', 'users')),
    true,
    'Data Admin can delete from public.users'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'products')),
    true,
    'Data Admin can select from public.products'
);

-- Test 3: Data Admin cannot access tables/actions they don't have permission for
SELECT is(
    (SELECT supamode.has_data_permission('insert'::supamode.system_action, 'public', 'products')),
    false,
    'Data Admin cannot insert into public.products (no permission)'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'private', 'users')),
    false,
    'Data Admin cannot select from private.users (no permission)'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'nonexistent')),
    false,
    'Data Admin cannot select from public.nonexistent (no permission)'
);

-- Test 4: Wildcard action permission allows all actions
SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'orders')),
    true,
    'Data Admin can select from public.orders (wildcard action)'
);

SELECT is(
    (SELECT supamode.has_data_permission('insert'::supamode.system_action, 'public', 'orders')),
    true,
    'Data Admin can insert into public.orders (wildcard action)'
);

SELECT is(
    (SELECT supamode.has_data_permission('update'::supamode.system_action, 'public', 'orders')),
    true,
    'Data Admin can update public.orders (wildcard action)'
);

SELECT is(
    (SELECT supamode.has_data_permission('delete'::supamode.system_action, 'public', 'orders')),
    true,
    'Data Admin can delete from public.orders (wildcard action)'
);

-- Test 5: Table User has limited permissions
SELECT kit.authenticate_as('table_user');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'users')),
    true,
    'Table User can select from public.users'
);

SELECT is(
    (SELECT supamode.has_data_permission('insert'::supamode.system_action, 'public', 'users')),
    false,
    'Table User cannot insert into public.users (no permission)'
);

SELECT is(
    (SELECT supamode.has_data_permission('update'::supamode.system_action, 'public', 'users')),
    false,
    'Table User cannot update public.users (no permission)'
);

SELECT is(
    (SELECT supamode.has_data_permission('delete'::supamode.system_action, 'public', 'users')),
    false,
    'Table User cannot delete from public.users (no permission)'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'products')),
    true,
    'Table User can select from public.products'
);

-- Test 6: User with no data permissions cannot access anything
SELECT kit.authenticate_as('no_permission_user');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'users')),
    false,
    'No Permission User cannot select from public.users'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'products')),
    false,
    'No Permission User cannot select from public.products'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'orders')),
    false,
    'No Permission User cannot select from public.orders'
);

-- Test 7: Schema User can access via wildcard permissions
SELECT kit.authenticate_as('schema_user');

-- Test public.* select permission
SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'users')),
    true,
    'Schema User can select from public.users (public.* wildcard)'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'products')),
    true,
    'Schema User can select from public.products (public.* wildcard)'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'orders')),
    true,
    'Schema User can select from public.orders (public.* wildcard)'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'any_table')),
    true,
    'Schema User can select from public.any_table (public.* wildcard)'
);

-- Test *.users select permission  
SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'private', 'users')),
    true,
    'Schema User can select from private.users (*.users wildcard)'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'admin', 'users')),
    true,
    'Schema User can select from admin.users (*.users wildcard)'
);

-- Test limitations of wildcard permissions
SELECT is(
    (SELECT supamode.has_data_permission('insert'::supamode.system_action, 'public', 'users')),
    false,
    'Schema User cannot insert into public.users (only select permission)'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'private', 'products')),
    false,
    'Schema User cannot select from private.products (no wildcard match)'
);

-- Test 8: Invalid parameters return false
SELECT kit.authenticate_as('data_admin');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, NULL, 'users')),
    false,
    'Function returns false for NULL schema'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', NULL)),
    false,
    'Function returns false for NULL table'
);

-- Test 9: Function respects role assignment validity
-- Remove role from user and verify permissions are lost
SET ROLE postgres;

-- remove constraint to allow invalid role assignment
ALTER TABLE supamode.account_roles DROP CONSTRAINT valid_time_range;

UPDATE supamode.account_roles 
SET valid_until = now() - interval '1 second'
WHERE account_id = kit.test_uuid(102);

SELECT kit.authenticate_as('table_user');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'users')),
    false,
    'Table User loses permissions when role assignment expires'
);

-- Restore role assignment
SET ROLE postgres;

UPDATE supamode.account_roles 
SET valid_until = NULL
WHERE account_id = kit.test_uuid(102);

-- Test 10: Function respects permission validity
-- Expire a permission and verify it's no longer accessible
ALTER TABLE supamode.role_permissions DROP CONSTRAINT valid_time_range;

UPDATE supamode.role_permissions 
SET valid_until = now() - interval '1 second'
WHERE role_id = kit.test_uuid(202) AND permission_id = kit.test_uuid(301);

SELECT kit.authenticate_as('table_user');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'users')),
    false,
    'Table User loses access when specific permission expires'
);

-- But other permissions should still work
SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'products')),
    true,
    'Table User retains other valid permissions'
);

-- Restore permission
UPDATE supamode.role_permissions 
SET valid_until = NULL
WHERE role_id = kit.test_uuid(202) AND permission_id = kit.test_uuid(301);

-- Test 11: Function works with role rank changes
-- Lower the rank of Data Admin role and verify they can still access their permissions
UPDATE supamode.roles 
SET rank = 85
WHERE id = kit.test_uuid(201);

SELECT kit.authenticate_as('data_admin');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'users')),
    true,
    'Data Admin retains permissions after role rank change'
);

-- Test 12: Multiple valid permission paths
-- Create an additional permission that would also grant access
SET ROLE postgres;

INSERT INTO supamode.permissions (id, name, permission_type, scope, schema_name, table_name, action) VALUES
    (kit.test_uuid(310), 'alternate_users_select', 'data', 'table', 'public', 'users', 'select');

INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    (kit.test_uuid(202), kit.test_uuid(310));

SELECT kit.authenticate_as('table_user');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'users')),
    true,
    'Table User has access via multiple permission paths'
);

-- Test 13: Case sensitivity test (schema and table names should be case sensitive)
SELECT kit.authenticate_as('data_admin');

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'PUBLIC', 'users')),
    false,
    'Function is case sensitive for schema names'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', 'USERS')),
    false,
    'Function is case sensitive for table names'
);

-- Test 14: Edge case - empty string parameters
SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, '', 'users')),
    false,
    'Function handles empty schema name correctly'
);

SELECT is(
    (SELECT supamode.has_data_permission('select'::supamode.system_action, 'public', '')),
    false,
    'Function handles empty table name correctly'
);

SELECT finish();

ROLLBACK;