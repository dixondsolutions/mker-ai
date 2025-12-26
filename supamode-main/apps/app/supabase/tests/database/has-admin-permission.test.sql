-- Test file: has_admin_permission.test.sql
-- Tests supamode.has_admin_permission function through actual operations
-- This tests system permission management through RLS policies and business rules

BEGIN;
CREATE EXTENSION "basejump-supabase_test_helpers" VERSION '0.0.6';

SELECT no_plan();

-- Clean up any existing test data
DELETE FROM supamode.permission_group_permissions;
DELETE FROM supamode.role_permission_groups;
DELETE FROM supamode.permission_groups;
DELETE FROM supamode.account_permissions;
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
SELECT kit.create_supabase_user(kit.test_uuid(2), 'role_manager', 'rolemanager@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'table_admin', 'tableadmin@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(4), 'read_only_user', 'readonly@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(5), 'no_permission_user', 'noperm@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
    (kit.test_uuid(101), kit.test_uuid(1), true),  -- Super Admin account
    (kit.test_uuid(102), kit.test_uuid(2), true),  -- Role Manager account  
    (kit.test_uuid(103), kit.test_uuid(3), true),  -- Table Admin account
    (kit.test_uuid(104), kit.test_uuid(4), true),  -- Read Only User account
    (kit.test_uuid(105), kit.test_uuid(5), true);  -- No Permission User account

-- Create roles with different priorities
INSERT INTO supamode.roles (id, name, rank, description) VALUES
    (kit.test_uuid(201), 'Super Admin', 100, 'Full system administration'),
    (kit.test_uuid(202), 'Role Manager', 60, 'Role and permission management'),
    (kit.test_uuid(203), 'Table Admin', 40, 'Table management only'),
    (kit.test_uuid(204), 'Read Only', 20, 'Read-only access'),
    (kit.test_uuid(205), 'No Permissions', 10, 'No system permissions');

-- Create system permissions for testing all system resources and actions
INSERT INTO supamode.permissions (id, name, permission_type, system_resource, action) VALUES
    -- Account management permissions
    (kit.test_uuid(301), 'account_select', 'system', 'account', 'select'),
    (kit.test_uuid(302), 'account_insert', 'system', 'account', 'insert'),
    (kit.test_uuid(303), 'account_update', 'system', 'account', 'update'),
    (kit.test_uuid(304), 'account_delete', 'system', 'account', 'delete'),
    (kit.test_uuid(305), 'account_all', 'system', 'account', '*'),
    
    -- Role management permissions
    (kit.test_uuid(311), 'role_select', 'system', 'role', 'select'),
    (kit.test_uuid(312), 'role_insert', 'system', 'role', 'insert'),
    (kit.test_uuid(313), 'role_update', 'system', 'role', 'update'),
    (kit.test_uuid(314), 'role_delete', 'system', 'role', 'delete'),
    (kit.test_uuid(315), 'role_all', 'system', 'role', '*'),
    
    -- Permission management permissions
    (kit.test_uuid(321), 'permission_select', 'system', 'permission', 'select'),
    (kit.test_uuid(322), 'permission_insert', 'system', 'permission', 'insert'),
    (kit.test_uuid(323), 'permission_update', 'system', 'permission', 'update'),
    (kit.test_uuid(324), 'permission_delete', 'system', 'permission', 'delete'),
    
    -- Log management permissions
    (kit.test_uuid(331), 'log_select', 'system', 'log', 'select'),
    (kit.test_uuid(332), 'log_delete', 'system', 'log', 'delete'),
    
    -- Table management permissions
    (kit.test_uuid(341), 'table_select', 'system', 'table', 'select'),
    (kit.test_uuid(342), 'table_update', 'system', 'table', 'update'),
    
    -- Auth user management permissions
    (kit.test_uuid(351), 'auth_user_select', 'system', 'auth_user', 'select'),
    (kit.test_uuid(352), 'auth_user_update', 'system', 'auth_user', 'update'),
    (kit.test_uuid(353), 'auth_user_delete', 'system', 'auth_user', 'delete'),
    
    -- System setting management permissions
    (kit.test_uuid(361), 'system_setting_select', 'system', 'system_setting', 'select'),
    (kit.test_uuid(362), 'system_setting_update', 'system', 'system_setting', 'update'),
    (kit.test_uuid(363), 'system_setting_insert', 'system', 'system_setting', 'insert'),
    (kit.test_uuid(364), 'system_setting_delete', 'system', 'system_setting', 'delete');

-- Assign roles to accounts
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(201)),  -- Super Admin
    (kit.test_uuid(102), kit.test_uuid(202)),  -- Role Manager
    (kit.test_uuid(103), kit.test_uuid(203)),  -- Table Admin
    (kit.test_uuid(104), kit.test_uuid(204)),  -- Read Only
    (kit.test_uuid(105), kit.test_uuid(205));  -- No Permissions

-- Grant permissions to roles
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    -- Super Admin gets all account permissions via wildcard
    (kit.test_uuid(201), kit.test_uuid(305)),  -- account *
    (kit.test_uuid(201), kit.test_uuid(315)),  -- role *
    (kit.test_uuid(201), kit.test_uuid(321)),  -- permission select
    (kit.test_uuid(201), kit.test_uuid(322)),  -- permission insert
    (kit.test_uuid(201), kit.test_uuid(323)),  -- permission update
    (kit.test_uuid(201), kit.test_uuid(324)),  -- permission delete
    (kit.test_uuid(201), kit.test_uuid(331)),  -- log select
    (kit.test_uuid(201), kit.test_uuid(332)),  -- log delete
    (kit.test_uuid(201), kit.test_uuid(341)),  -- table select
    (kit.test_uuid(201), kit.test_uuid(342)),  -- table update
    (kit.test_uuid(201), kit.test_uuid(351)),  -- auth_user select
    (kit.test_uuid(201), kit.test_uuid(352)),  -- auth_user update
    (kit.test_uuid(201), kit.test_uuid(353)),  -- auth_user delete
    (kit.test_uuid(201), kit.test_uuid(361)),  -- system_setting select
    (kit.test_uuid(201), kit.test_uuid(362)),  -- system_setting update
    (kit.test_uuid(201), kit.test_uuid(363)),  -- system_setting insert
    (kit.test_uuid(201), kit.test_uuid(364)),  -- system_setting delete
    
    -- Role Manager gets role and permission management
    (kit.test_uuid(202), kit.test_uuid(311)),  -- role select
    (kit.test_uuid(202), kit.test_uuid(312)),  -- role insert
    (kit.test_uuid(202), kit.test_uuid(313)),  -- role update
    (kit.test_uuid(202), kit.test_uuid(314)),  -- role delete
    (kit.test_uuid(202), kit.test_uuid(321)),  -- permission select
    (kit.test_uuid(202), kit.test_uuid(322)),  -- permission insert
    (kit.test_uuid(202), kit.test_uuid(323)),  -- permission update
    
    -- Table Admin gets table management only
    (kit.test_uuid(203), kit.test_uuid(341)),  -- table select
    (kit.test_uuid(203), kit.test_uuid(342)),  -- table update
    
    -- Read Only gets select permissions only
    (kit.test_uuid(204), kit.test_uuid(301)),  -- account select
    (kit.test_uuid(204), kit.test_uuid(311)),  -- role select
    (kit.test_uuid(204), kit.test_uuid(321)),  -- permission select
    (kit.test_uuid(204), kit.test_uuid(331)),  -- log select
    (kit.test_uuid(204), kit.test_uuid(341)),  -- table select
    (kit.test_uuid(204), kit.test_uuid(351)),  -- auth_user select
    (kit.test_uuid(204), kit.test_uuid(361));  -- system_setting select

-- Test 1: User without admin access cannot use has_admin_permission
SELECT kit.authenticate_as('no_permission_user');
SELECT kit.set_admin_access('noperm@test.com', 'false');

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'User without admin access cannot use has_admin_permission'
);

-- Restore admin access for remaining tests
SELECT kit.set_admin_access('noperm@test.com', 'true');

-- Test 2: Super Admin can perform all account operations via wildcard permission
SELECT kit.authenticate_as('super_admin');

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Super Admin can select accounts (wildcard permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'insert'::supamode.system_action)),
    true,
    'Super Admin can insert accounts (wildcard permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'update'::supamode.system_action)),
    true,
    'Super Admin can update accounts (wildcard permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'delete'::supamode.system_action)),
    true,
    'Super Admin can delete accounts (wildcard permission)'
);

-- Test 3: Super Admin can perform all role operations via wildcard permission
SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Super Admin can select roles (wildcard permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'insert'::supamode.system_action)),
    true,
    'Super Admin can insert roles (wildcard permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'update'::supamode.system_action)),
    true,
    'Super Admin can update roles (wildcard permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'delete'::supamode.system_action)),
    true,
    'Super Admin can delete roles (wildcard permission)'
);

-- Test 4: Super Admin has specific permission permissions (not wildcard)
SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Super Admin can select permissions'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'insert'::supamode.system_action)),
    true,
    'Super Admin can insert permissions'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'update'::supamode.system_action)),
    true,
    'Super Admin can update permissions'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'delete'::supamode.system_action)),
    true,
    'Super Admin can delete permissions'
);

-- Test 5: Super Admin has other system resource permissions
SELECT is(
    (SELECT supamode.has_admin_permission('log'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Super Admin can select logs'
);

SELECT is(
    (SELECT supamode.has_admin_permission('log'::supamode.system_resource, 'delete'::supamode.system_action)),
    true,
    'Super Admin can delete logs'
);

SELECT is(
    (SELECT supamode.has_admin_permission('table'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Super Admin can select table metadata'
);

SELECT is(
    (SELECT supamode.has_admin_permission('table'::supamode.system_resource, 'update'::supamode.system_action)),
    true,
    'Super Admin can update table metadata'
);

SELECT is(
    (SELECT supamode.has_admin_permission('auth_user'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Super Admin can select auth users'
);

SELECT is(
    (SELECT supamode.has_admin_permission('auth_user'::supamode.system_resource, 'update'::supamode.system_action)),
    true,
    'Super Admin can update auth users'
);

SELECT is(
    (SELECT supamode.has_admin_permission('auth_user'::supamode.system_resource, 'delete'::supamode.system_action)),
    true,
    'Super Admin can delete auth users'
);

SELECT is(
    (SELECT supamode.has_admin_permission('system_setting'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Super Admin can select system settings'
);

SELECT is(
    (SELECT supamode.has_admin_permission('system_setting'::supamode.system_resource, 'update'::supamode.system_action)),
    true,
    'Super Admin can update system settings'
);

SELECT is(
    (SELECT supamode.has_admin_permission('system_setting'::supamode.system_resource, 'insert'::supamode.system_action)),
    true,
    'Super Admin can insert system settings'
);

SELECT is(
    (SELECT supamode.has_admin_permission('system_setting'::supamode.system_resource, 'delete'::supamode.system_action)),
    true,
    'Super Admin can delete system settings'
);

-- Test 6: Role Manager has specific role and permission management permissions
SELECT kit.authenticate_as('role_manager');

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Role Manager can select roles'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'insert'::supamode.system_action)),
    true,
    'Role Manager can insert roles'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'update'::supamode.system_action)),
    true,
    'Role Manager can update roles'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'delete'::supamode.system_action)),
    true,
    'Role Manager can delete roles'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Role Manager can select permissions'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'insert'::supamode.system_action)),
    true,
    'Role Manager can insert permissions'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'update'::supamode.system_action)),
    true,
    'Role Manager can update permissions'
);

-- Test 7: Role Manager cannot perform operations they don't have permission for
SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'delete'::supamode.system_action)),
    false,
    'Role Manager cannot delete permissions (no permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'Role Manager cannot select accounts (no permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('log'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'Role Manager cannot select logs (no permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('table'::supamode.system_resource, 'update'::supamode.system_action)),
    false,
    'Role Manager cannot update table metadata (no permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('auth_user'::supamode.system_resource, 'update'::supamode.system_action)),
    false,
    'Role Manager cannot update auth users (no permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('system_setting'::supamode.system_resource, 'update'::supamode.system_action)),
    false,
    'Role Manager cannot update system settings (no permission)'
);

-- Test 8: Table Admin has limited permissions (table management only)
SELECT kit.authenticate_as('table_admin');

SELECT is(
    (SELECT supamode.has_admin_permission('table'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Table Admin can select table metadata'
);

SELECT is(
    (SELECT supamode.has_admin_permission('table'::supamode.system_resource, 'update'::supamode.system_action)),
    true,
    'Table Admin can update table metadata'
);

-- Table Admin cannot access other resources
SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'Table Admin cannot select roles (no permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'Table Admin cannot select permissions (no permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'Table Admin cannot select accounts (no permission)'
);

SELECT is(
    (SELECT supamode.has_admin_permission('log'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'Table Admin cannot select logs (no permission)'
);

-- Test 9: Read Only User has select permissions for most resources
SELECT kit.authenticate_as('read_only_user');

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Read Only User can select accounts'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Read Only User can select roles'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Read Only User can select permissions'
);

SELECT is(
    (SELECT supamode.has_admin_permission('log'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Read Only User can select logs'
);

SELECT is(
    (SELECT supamode.has_admin_permission('table'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Read Only User can select table metadata'
);

SELECT is(
    (SELECT supamode.has_admin_permission('auth_user'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Read Only User can select auth users'
);

SELECT is(
    (SELECT supamode.has_admin_permission('system_setting'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Read Only User can select system settings'
);

-- Test 10: Read Only User cannot perform write operations
SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'update'::supamode.system_action)),
    false,
    'Read Only User cannot update accounts'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'insert'::supamode.system_action)),
    false,
    'Read Only User cannot insert roles'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'delete'::supamode.system_action)),
    false,
    'Read Only User cannot delete permissions'
);

SELECT is(
    (SELECT supamode.has_admin_permission('table'::supamode.system_resource, 'update'::supamode.system_action)),
    false,
    'Read Only User cannot update table metadata'
);

SELECT is(
    (SELECT supamode.has_admin_permission('auth_user'::supamode.system_resource, 'delete'::supamode.system_action)),
    false,
    'Read Only User cannot delete auth users'
);

SELECT is(
    (SELECT supamode.has_admin_permission('system_setting'::supamode.system_resource, 'update'::supamode.system_action)),
    false,
    'Read Only User cannot update system settings'
);

-- Test 11: User with no permissions cannot access anything
SELECT kit.authenticate_as('no_permission_user');

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'No Permission User cannot select accounts'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'No Permission User cannot select roles'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'No Permission User cannot select permissions'
);

SELECT is(
    (SELECT supamode.has_admin_permission('log'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'No Permission User cannot select logs'
);

SELECT is(
    (SELECT supamode.has_admin_permission('table'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'No Permission User cannot select table metadata'
);

SELECT is(
    (SELECT supamode.has_admin_permission('auth_user'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'No Permission User cannot select auth users'
);

SELECT is(
    (SELECT supamode.has_admin_permission('system_setting'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'No Permission User cannot select system settings'
);

-- Test 12: Direct account permissions (not via role)
-- Give direct permission to No Permission User
SET ROLE postgres;

INSERT INTO supamode.account_permissions (account_id, permission_id, is_grant) VALUES
    (kit.test_uuid(105), kit.test_uuid(341), true);  -- table select

SELECT kit.authenticate_as('no_permission_user');

SELECT is(
    (SELECT supamode.has_admin_permission('table'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'User with direct account permission can access resource'
);

-- But still cannot access other resources
SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'User with direct permission cannot access other resources'
);

-- Test 13: Permission groups work correctly
SET ROLE postgres;

-- Create a permission group
INSERT INTO supamode.permission_groups (id, name, description) VALUES
    (kit.test_uuid(401), 'System Readers', 'Read access to system resources');

-- Add permissions to the group
INSERT INTO supamode.permission_group_permissions (group_id, permission_id) VALUES
    (kit.test_uuid(401), kit.test_uuid(301)),  -- account select
    (kit.test_uuid(401), kit.test_uuid(311)),  -- role select
    (kit.test_uuid(401), kit.test_uuid(321));  -- permission select

-- Assign the group to a role
INSERT INTO supamode.role_permission_groups (role_id, group_id) VALUES
    (kit.test_uuid(205), kit.test_uuid(401));

SELECT kit.authenticate_as('no_permission_user');

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'User can access permissions via permission groups'
);

SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'User can access role permissions via permission groups'
);

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'User can access permission permissions via permission groups'
);

-- But still cannot access permissions not in the group
SELECT is(
    (SELECT supamode.has_admin_permission('log'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'User cannot access permissions not in group'
);

-- Test 14: Explicit denial takes precedence over grants
SET ROLE postgres;

-- Add explicit denial for account select
INSERT INTO supamode.account_permissions (account_id, permission_id, is_grant) VALUES
    (kit.test_uuid(105), kit.test_uuid(301), false);  -- account select - DENY

SELECT kit.authenticate_as('no_permission_user');

SELECT is(
    (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'Explicit denial takes precedence over group permission grants'
);

-- But other group permissions still work
SELECT is(
    (SELECT supamode.has_admin_permission('role'::supamode.system_resource, 'select'::supamode.system_action)),
    true,
    'Other group permissions still work when one is explicitly denied'
);

-- Test 
-- remove constraint to allow invalid role assignment
SET ROLE postgres;

ALTER TABLE supamode.account_roles DROP CONSTRAINT valid_time_range;

UPDATE supamode.account_roles 
SET valid_until = now() - interval '1 second'
WHERE account_id = kit.test_uuid(102);

-- Test 15: Role assignment expires
SELECT kit.authenticate_as('role_manager');

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'Role Manager loses permissions when role assignment expires'
);

-- Restore role assignment
SET ROLE postgres;

UPDATE supamode.account_roles 
SET valid_until = NULL
WHERE account_id = kit.test_uuid(102);

-- Test 16: Permission expires
-- remove constraint to allow invalid permission assignment
SET ROLE postgres;

ALTER TABLE supamode.role_permissions DROP CONSTRAINT valid_time_range;

UPDATE supamode.role_permissions 
SET valid_until = now() - interval '1 second'
WHERE role_id = kit.test_uuid(202) AND permission_id = kit.test_uuid(321);

SELECT kit.authenticate_as('role_manager');

SELECT is(
    (SELECT supamode.has_admin_permission('permission'::supamode.system_resource, 'select'::supamode.system_action)),
    false,
    'Role Manager loses permissions when permission expires'
);

SELECT finish();

ROLLBACK;