-- Test file: can_action_role.test.sql
-- Tests supamode.can_action_role function through actual role operations
-- This tests role modification security through RLS policies and business rules

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
SELECT kit.create_supabase_user(kit.test_uuid(2), 'senior_manager', 'senior@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'manager', 'manager@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(4), 'junior_user', 'junior@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(5), 'no_role_user', 'norole@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(6), 'no_permission_user', 'noperm@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
    (kit.test_uuid(101), kit.test_uuid(1), true),  -- Super Admin account
    (kit.test_uuid(102), kit.test_uuid(2), true),  -- Senior Manager account  
    (kit.test_uuid(103), kit.test_uuid(3), true),  -- Manager account
    (kit.test_uuid(104), kit.test_uuid(4), true),  -- Junior User account
    (kit.test_uuid(105), kit.test_uuid(5), true),  -- No Role User account
    (kit.test_uuid(106), kit.test_uuid(6), true);  -- No Permission User account

-- Create roles with specific rank hierarchy
INSERT INTO supamode.roles (id, name, rank, description) VALUES
    (kit.test_uuid(201), 'Super Admin', 100, 'Highest rank role'),
    (kit.test_uuid(202), 'Senior Manager', 80, 'Senior management role'),
    (kit.test_uuid(203), 'Manager', 60, 'Management role'),
    (kit.test_uuid(204), 'Junior', 40, 'Junior user role'),
    (kit.test_uuid(205), 'Intern', 20, 'Lowest rank role'),
    (kit.test_uuid(206), 'No Permissions Role', 10, 'Role with no permissions');

-- Create system permissions for role management
INSERT INTO supamode.permissions (id, name, permission_type, system_resource, action) VALUES
    (kit.test_uuid(301), 'role_select', 'system', 'role', 'select'),
    (kit.test_uuid(302), 'role_insert', 'system', 'role', 'insert'),
    (kit.test_uuid(303), 'role_update', 'system', 'role', 'update'),
    (kit.test_uuid(304), 'role_delete', 'system', 'role', 'delete'),
    (kit.test_uuid(305), 'role_all', 'system', 'role', '*');

-- Assign roles to accounts
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(201)),  -- Super Admin (rank 100)
    (kit.test_uuid(102), kit.test_uuid(202)),  -- Senior Manager (rank 80)
    (kit.test_uuid(103), kit.test_uuid(203)),  -- Manager (rank 60)
    (kit.test_uuid(104), kit.test_uuid(204)),  -- Junior (rank 40)
    -- Note: No Role User and No Permission User get no role assignments
    (kit.test_uuid(106), kit.test_uuid(206)); -- No Permission User gets a role but no permissions

-- Grant permissions to roles
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    -- Super Admin gets all role permissions via wildcard
    (kit.test_uuid(201), kit.test_uuid(305)),  -- role *
    
    -- Senior Manager gets all specific role permissions
    (kit.test_uuid(202), kit.test_uuid(301)),  -- role select
    (kit.test_uuid(202), kit.test_uuid(302)),  -- role insert
    (kit.test_uuid(202), kit.test_uuid(303)),  -- role update
    (kit.test_uuid(202), kit.test_uuid(304)),  -- role delete
    
    -- Manager gets insert, update, select but not delete
    (kit.test_uuid(203), kit.test_uuid(301)),  -- role select
    (kit.test_uuid(203), kit.test_uuid(302)),  -- role insert
    (kit.test_uuid(203), kit.test_uuid(303)),  -- role update
    
    -- Junior gets only select
    (kit.test_uuid(204), kit.test_uuid(301));  -- role select

-- Test 1: User without admin access cannot action roles
SELECT kit.authenticate_as('no_permission_user');
SELECT kit.set_admin_access('noperm@test.com', 'false');

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'select'::supamode.system_action)),
    false,
    'User without admin access cannot action roles'
);

-- Restore admin access for remaining tests
SELECT kit.set_admin_access('noperm@test.com', 'true');

-- Test 2: User without role permissions cannot action roles
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'select'::supamode.system_action)),
    false,
    'User without role permissions cannot action roles'
);

-- Test 3: User with no roles cannot action any roles
SELECT kit.authenticate_as('no_role_user');

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'select'::supamode.system_action)),
    false,
    'User with no roles cannot action any roles'
);

-- Test 4: Super Admin can action all lower rank roles
SELECT kit.authenticate_as('super_admin');

-- Can action Senior Manager role (rank 80)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(202), 'select'::supamode.system_action)),
    true,
    'Super Admin can select Senior Manager role (rank 80 < 100)'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(202), 'update'::supamode.system_action)),
    true,
    'Super Admin can update Senior Manager role'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(202), 'delete'::supamode.system_action)),
    true,
    'Super Admin can delete Senior Manager role'
);

-- Can action Manager role (rank 60)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(203), 'select'::supamode.system_action)),
    true,
    'Super Admin can select Manager role (rank 60 < 100)'
);

-- Can action Junior role (rank 40)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(204), 'update'::supamode.system_action)),
    true,
    'Super Admin can update Junior role (rank 40 < 100)'
);

-- Can action Intern role (rank 20)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'delete'::supamode.system_action)),
    true,
    'Super Admin can delete Intern role (rank 20 < 100)'
);

-- Test 5: Super Admin cannot action their own role (equal rank)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(201), 'update'::supamode.system_action)),
    false,
    'Super Admin cannot update their own role (equal rank)'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(201), 'delete'::supamode.system_action)),
    false,
    'Super Admin cannot delete their own role (equal rank)'
);

-- Test 6: Senior Manager can action lower rank roles but not equal/higher
SELECT kit.authenticate_as('senior_manager');

-- Can action Manager role (rank 60)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(203), 'select'::supamode.system_action)),
    true,
    'Senior Manager can select Manager role (rank 60 < 80)'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(203), 'update'::supamode.system_action)),
    true,
    'Senior Manager can update Manager role'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(203), 'delete'::supamode.system_action)),
    true,
    'Senior Manager can delete Manager role'
);

-- Can action Junior role (rank 40)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(204), 'select'::supamode.system_action)),
    true,
    'Senior Manager can select Junior role (rank 40 < 80)'
);

-- Can action Intern role (rank 20)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'update'::supamode.system_action)),
    true,
    'Senior Manager can update Intern role (rank 20 < 80)'
);

-- Cannot action Super Admin role (rank 100)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(201), 'select'::supamode.system_action)),
    false,
    'Senior Manager cannot select Super Admin role (rank 100 > 80)'
);

-- Cannot action their own role (equal rank)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(202), 'update'::supamode.system_action)),
    false,
    'Senior Manager cannot update their own role (equal rank)'
);

-- Test 7: Manager can action lower rank roles but not equal/higher
SELECT kit.authenticate_as('manager');

-- Can action Junior role (rank 40)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(204), 'select'::supamode.system_action)),
    true,
    'Manager can select Junior role (rank 40 < 60)'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(204), 'update'::supamode.system_action)),
    true,
    'Manager can update Junior role'
);

-- Note: Manager doesn't have delete permission, so this should fail for permission reasons
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(204), 'delete'::supamode.system_action)),
    false,
    'Manager cannot delete Junior role (no delete permission)'
);

-- Can action Intern role (rank 20)  
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'select'::supamode.system_action)),
    true,
    'Manager can select Intern role (rank 20 < 60)'
);

-- Cannot action Senior Manager role (rank 80)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(202), 'select'::supamode.system_action)),
    false,
    'Manager cannot select Senior Manager role (rank 80 > 60)'
);

-- Cannot action Super Admin role (rank 100)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(201), 'select'::supamode.system_action)),
    false,
    'Manager cannot select Super Admin role (rank 100 > 60)'
);

-- Cannot action their own role (equal rank)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(203), 'update'::supamode.system_action)),
    false,
    'Manager cannot update their own role (equal rank)'
);

-- Test 8: Junior User has very limited access
SELECT kit.authenticate_as('junior_user');

-- Can only select lower rank roles (only has select permission)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'select'::supamode.system_action)),
    true,
    'Junior User can select Intern role (rank 20 < 40)'
);

-- Cannot update even lower rank roles (no update permission)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'update'::supamode.system_action)),
    false,
    'Junior User cannot update Intern role (no update permission)'
);

-- Cannot insert new roles (no insert permission)
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'insert'::supamode.system_action)),
    false,
    'Junior User cannot insert roles (no insert permission)'
);

-- Cannot action equal or higher rank roles
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(204), 'select'::supamode.system_action)),
    false,
    'Junior User cannot select their own role (equal rank)'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(203), 'select'::supamode.system_action)),
    false,
    'Junior User cannot select Manager role (rank 60 > 40)'
);

-- Test 9: Function returns false for non-existent roles
SELECT kit.authenticate_as('super_admin');

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(999), 'select'::supamode.system_action)),
    false,
    'Function returns false for non-existent role'
);

-- Test 10: Function validates action parameter
SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'select'::supamode.system_action)),
    true,
    'Function accepts valid select action'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'insert'::supamode.system_action)),
    true,
    'Function accepts valid insert action'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'update'::supamode.system_action)),
    true,
    'Function accepts valid update action'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(205), 'delete'::supamode.system_action)),
    true,
    'Function accepts valid delete action'
);

-- Test 11: Actual role operations work as expected based on can_action_role
-- Super Admin should be able to update lower rank roles
UPDATE supamode.roles 
SET description = 'Updated by Super Admin' 
WHERE id = kit.test_uuid(202);

SELECT row_eq(
    $$ SELECT description FROM supamode.roles WHERE id = kit.test_uuid(202) $$,
    ROW('Updated by Super Admin'::varchar),
    'Super Admin can actually update lower rank roles'
);

-- Super Admin cannot update their own role (should be silent failure for UPDATE)
UPDATE supamode.roles 
SET description = 'Trying to update own role' 
WHERE id = kit.test_uuid(201);

SELECT row_eq(
    $$ SELECT description FROM supamode.roles WHERE id = kit.test_uuid(201) $$,
    ROW('Highest rank role'::varchar),
    'Super Admin cannot actually update their own role (no change occurred)'
);

-- Test 12: Manager can update lower rank roles but not higher
SELECT kit.authenticate_as('manager');

UPDATE supamode.roles 
SET description = 'Updated by Manager' 
WHERE id = kit.test_uuid(204);

SELECT row_eq(
    $$ SELECT description FROM supamode.roles WHERE id = kit.test_uuid(204) $$,
    ROW('Updated by Manager'::varchar),
    'Manager can actually update lower rank roles'
);

-- Manager cannot update higher rank roles (should be silent failure)
UPDATE supamode.roles 
SET description = 'Trying to hack Senior Manager role' 
WHERE id = kit.test_uuid(202);

SELECT row_eq(
    $$ SELECT description FROM supamode.roles WHERE id = kit.test_uuid(202) $$,
    ROW('Updated by Super Admin'::varchar),
    'Manager cannot actually update higher rank roles (no change occurred)'
);

-- Test 13: Role creation follows can_action_role rules
SELECT kit.authenticate_as('super_admin');

-- Super Admin can create roles with lower rank
SELECT lives_ok(
    $$ INSERT INTO supamode.roles (id, name, rank, description) 
       VALUES (kit.test_uuid(210), 'New Admin Role', 90, 'Created by Super Admin') $$,
    'Super Admin can create roles with lower rank'
);

-- Test 14: Role deletion follows can_action_role rules  
-- First remove any dependencies
DELETE FROM supamode.account_roles WHERE role_id = kit.test_uuid(205);

-- Super Admin can delete lower rank roles
DELETE FROM supamode.roles WHERE id = kit.test_uuid(205);

SELECT is_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(205) $$,
    'Super Admin can delete lower rank roles'
);

-- Test 15: Manager cannot delete roles (no delete permission)
SELECT kit.authenticate_as('manager');

-- Even though Manager has higher rank than Junior, they can't delete due to missing permission
DELETE FROM supamode.roles WHERE id = kit.test_uuid(204);

SELECT isnt_empty(
    $$ SELECT * FROM supamode.roles WHERE id = kit.test_uuid(204) $$,
    'Manager cannot delete roles even with higher rank (missing delete permission)'
);

-- Test 16: Edge case - NULL parameters
SELECT kit.authenticate_as('super_admin');

SELECT is(
    (SELECT supamode.can_action_role(NULL, 'select'::supamode.system_action)),
    false,
    'Function returns false for NULL role_id'
);

SELECT is(
    (SELECT supamode.can_action_role(kit.test_uuid(204), NULL)),
    false,
    'Function returns false for NULL action'
);

SELECT finish();

ROLLBACK