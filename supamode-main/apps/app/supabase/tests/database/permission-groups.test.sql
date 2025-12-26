-- Test file: permission_groups.test.sql
-- Tests permission group operations through actual CRUD operations
-- This tests permission group management through RLS policies and business rules

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
SELECT kit.create_supabase_user(kit.test_uuid(2), 'permission_manager', 'permmanager@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'regular_admin', 'regularadmin@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(4), 'low_rank_user', 'lowrank@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(5), 'no_permission_user', 'noperm@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
                                                                (kit.test_uuid(101), kit.test_uuid(1), true),  -- Super Admin account
                                                                (kit.test_uuid(102), kit.test_uuid(2), true),  -- Permission Manager account
                                                                (kit.test_uuid(103), kit.test_uuid(3), true),  -- Regular Admin account
                                                                (kit.test_uuid(104), kit.test_uuid(4), true),  -- Low rank User account
                                                                (kit.test_uuid(105), kit.test_uuid(5), true);  -- No Permission User account

-- Create roles with different priorities
INSERT INTO supamode.roles (id, name, rank, description) VALUES
                                                                 (kit.test_uuid(201), 'Super Admin', 100, 'Highest rank role'),
                                                                 (kit.test_uuid(202), 'Permission Manager', 70, 'Permission management role'),
                                                                 (kit.test_uuid(203), 'Regular Admin', 50, 'Regular administration role'),
                                                                 (kit.test_uuid(204), 'Low rank', 20, 'Low rank role'),
                                                                 (kit.test_uuid(205), 'No Permissions', 10, 'No permissions role');

-- Create system permissions for permission management
INSERT INTO supamode.permissions (id, name, permission_type, system_resource, action) VALUES
                                                                                          (kit.test_uuid(301), 'permission_insert', 'system', 'permission', 'insert'),
                                                                                          (kit.test_uuid(302), 'permission_update', 'system', 'permission', 'update'),
                                                                                          (kit.test_uuid(303), 'permission_delete', 'system', 'permission', 'delete'),
                                                                                          (kit.test_uuid(304), 'permission_select', 'system', 'permission', 'select'),
                                                                                          -- Role management permissions (needed for role_permission_groups)
                                                                                          (kit.test_uuid(305), 'role_insert', 'system', 'role', 'insert'),
                                                                                          (kit.test_uuid(306), 'role_update', 'system', 'role', 'update'),
                                                                                          (kit.test_uuid(307), 'role_delete', 'system', 'role', 'delete'),
                                                                                          (kit.test_uuid(308), 'role_select', 'system', 'role', 'select'),
                                                                                          -- Additional permissions for testing groups
                                                                                          (kit.test_uuid(311), 'account_select', 'system', 'account', 'select'),
                                                                                          (kit.test_uuid(312), 'account_update', 'system', 'account', 'update'),
                                                                                          (kit.test_uuid(313), 'table_select', 'system', 'table', 'select'),
                                                                                          (kit.test_uuid(314), 'table_update', 'system', 'table', 'update');

-- Assign roles to accounts
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
                                                             (kit.test_uuid(101), kit.test_uuid(201)),  -- Super Admin
                                                             (kit.test_uuid(102), kit.test_uuid(202)),  -- Permission Manager
                                                             (kit.test_uuid(103), kit.test_uuid(203)),  -- Regular Admin
                                                             (kit.test_uuid(104), kit.test_uuid(204)),  -- Low rank User
                                                             (kit.test_uuid(105), kit.test_uuid(205));  -- No Permission User

-- Grant permissions to roles
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
                                                                   -- Super Admin gets all permission management rights
                                                                   (kit.test_uuid(201), kit.test_uuid(301)),
                                                                   (kit.test_uuid(201), kit.test_uuid(302)),
                                                                   (kit.test_uuid(201), kit.test_uuid(303)),
                                                                   (kit.test_uuid(201), kit.test_uuid(304)),
                                                                   -- Super Admin gets role management rights
                                                                   (kit.test_uuid(201), kit.test_uuid(305)),
                                                                   (kit.test_uuid(201), kit.test_uuid(306)),
                                                                   (kit.test_uuid(201), kit.test_uuid(307)),
                                                                   (kit.test_uuid(201), kit.test_uuid(308)),
                                                                   -- Permission Manager gets permission management rights
                                                                   (kit.test_uuid(202), kit.test_uuid(301)),
                                                                   (kit.test_uuid(202), kit.test_uuid(302)),
                                                                   (kit.test_uuid(202), kit.test_uuid(303)),
                                                                   (kit.test_uuid(202), kit.test_uuid(304)),
                                                                   -- Permission Manager gets role management rights (needed for role_permission_groups)
                                                                   (kit.test_uuid(202), kit.test_uuid(305)),
                                                                   (kit.test_uuid(202), kit.test_uuid(306)),
                                                                   (kit.test_uuid(202), kit.test_uuid(307)),
                                                                   (kit.test_uuid(202), kit.test_uuid(308)),
                                                                   -- Regular Admin gets limited permission management
                                                                   (kit.test_uuid(203), kit.test_uuid(301)),
                                                                   (kit.test_uuid(203), kit.test_uuid(304));

-- Test 1: User without admin access cannot view permission groups
SELECT kit.authenticate_as('no_permission_user');
SELECT kit.set_admin_access('noperm@test.com', 'false');

SELECT is_empty(
               $$ SELECT * FROM supamode.permission_groups $$,
               'User without admin access cannot view permission groups'
       );

-- Restore admin access for remaining tests
SELECT kit.set_admin_access('noperm@test.com', 'true');

-- Test 2: Super Admin can create permission groups
SELECT kit.authenticate_as('super_admin');

INSERT INTO supamode.permission_groups (id, name, description)
VALUES (kit.test_uuid(401), 'Admin Group', 'Administrative permissions group');

SELECT row_eq(
               $$ SELECT name, description FROM supamode.permission_groups WHERE id = kit.test_uuid(401) $$,
               ROW('Admin Group'::varchar, 'Administrative permissions group'::text),
               'Super Admin can create permission groups'
       );

-- Test 3: Permission Manager can create permission groups
SELECT kit.authenticate_as('permission_manager');

INSERT INTO supamode.permission_groups (id, name, description)
VALUES (kit.test_uuid(402), 'Manager Group', 'Manager permissions group');

SELECT row_eq(
               $$ SELECT name, description FROM supamode.permission_groups WHERE id = kit.test_uuid(402) $$,
               ROW('Manager Group'::varchar, 'Manager permissions group'::text),
               'Permission Manager can create permission groups'
       );

-- Test 4: User without permission insert rights cannot create groups
SELECT kit.authenticate_as('low_rank_user');

SELECT throws_ok(
               $$ INSERT INTO supamode.permission_groups (id, name, description)
       VALUES (kit.test_uuid(403), 'Unauthorized Group', 'Should not work') $$,
               'new row violates row-level security policy for table "permission_groups"',
               'User without permission insert rights cannot create groups'
       );

-- Test 5: Super Admin can add permissions to groups they created
SELECT kit.authenticate_as('super_admin');

INSERT INTO supamode.permission_group_permissions (group_id, permission_id)
VALUES (kit.test_uuid(401), kit.test_uuid(311));  -- account_select

SELECT row_eq(
               $$ SELECT group_id, permission_id FROM supamode.permission_group_permissions
       WHERE group_id = kit.test_uuid(401) AND permission_id = kit.test_uuid(311) $$,
               ROW(kit.test_uuid(401), kit.test_uuid(311)),
               'Super Admin can add permissions to groups they created'
       );

-- Test 6: Permission Manager can add permissions to groups they created
SELECT kit.authenticate_as('permission_manager');

INSERT INTO supamode.permission_group_permissions (group_id, permission_id)
VALUES (kit.test_uuid(402), kit.test_uuid(313));  -- table_select

SELECT row_eq(
               $$ SELECT group_id, permission_id FROM supamode.permission_group_permissions
       WHERE group_id = kit.test_uuid(402) AND permission_id = kit.test_uuid(313) $$,
               ROW(kit.test_uuid(402), kit.test_uuid(313)),
               'Permission Manager can add permissions to groups they created'
       );

-- Test 7: First assign the Manager Group to a low rank role so Super Admin can view it
SELECT kit.authenticate_as('super_admin');

-- Assign Manager Group to Low rank role first
INSERT INTO supamode.role_permission_groups (role_id, group_id)
VALUES (kit.test_uuid(204), kit.test_uuid(402));  -- Low rank gets Manager Group

-- Now Super Admin can add permissions to it since it's assigned to a lower rank role
INSERT INTO supamode.permission_group_permissions (group_id, permission_id)
VALUES (kit.test_uuid(402), kit.test_uuid(314));  -- table_update

SELECT row_eq(
               $$ SELECT group_id, permission_id FROM supamode.permission_group_permissions
       WHERE group_id = kit.test_uuid(402) AND permission_id = kit.test_uuid(314) $$,
               ROW(kit.test_uuid(402), kit.test_uuid(314)),
               'Super Admin can add permissions to groups assigned to lower rank roles'
       );

-- Test 8: Permission Manager cannot modify groups assigned to equal/higher rank roles
-- Assign Admin Group to Super Admin role
set role postgres;
INSERT INTO supamode.role_permission_groups (role_id, group_id)
VALUES (kit.test_uuid(201), kit.test_uuid(401));  -- Super Admin gets Admin Group

SELECT kit.authenticate_as('permission_manager');

SELECT throws_ok(
               $$ INSERT INTO supamode.permission_group_permissions (group_id, permission_id)
       VALUES (kit.test_uuid(401), kit.test_uuid(312)) $$,  -- Try to add to Admin Group
               'This user cannot modify this permission group because it is used by a role with a higher rank than their own.',
               'Permission Manager cannot add permissions to groups used by higher rank roles'
       );

-- Test 9: Permission Manager can assign groups to lower rank roles
INSERT INTO supamode.role_permission_groups (role_id, group_id)
VALUES (kit.test_uuid(203), kit.test_uuid(402));  -- Regular Admin also gets Manager Group

SELECT row_eq(
               $$ SELECT role_id, group_id FROM supamode.role_permission_groups
       WHERE role_id = kit.test_uuid(203) AND group_id = kit.test_uuid(402) $$,
               ROW(kit.test_uuid(203), kit.test_uuid(402)),
               'Permission Manager can assign groups to lower rank roles'
       );

-- Test 10: Permission Manager cannot assign groups to higher rank roles
SELECT throws_ok(
               $$ INSERT INTO supamode.role_permission_groups (role_id, group_id)
       VALUES (kit.test_uuid(201), kit.test_uuid(402)) $$,  -- Super Admin role
               'new row violates row-level security policy for table "role_permission_groups"',
               'Permission Manager cannot assign groups to higher rank roles'
       );

-- Test 11: Users can view groups they have access to through roles
SELECT kit.authenticate_as('regular_admin');

-- Regular Admin can see Manager Group since it's assigned to their role (rank 50)
SELECT isnt_empty(
               $$ SELECT * FROM supamode.permission_groups WHERE id = kit.test_uuid(402) $$,
               'Regular Admin can view groups assigned to their role'
       );

-- But cannot see Admin Group since it's assigned to Super Admin role (higher rank)
SELECT is_empty(
               $$ SELECT * FROM supamode.permission_groups WHERE id = kit.test_uuid(401) $$,
               'Regular Admin cannot view groups assigned to higher rank roles'
       );

-- Test 12: Regular Admin can view group permissions for groups they have access to
SELECT isnt_empty(
               $$ SELECT * FROM supamode.permission_group_permissions WHERE group_id = kit.test_uuid(402) $$,
               'Regular Admin can view permissions in groups assigned to their role'
       );

-- Test 13: Users can view role-group assignments based on their access
-- Regular Admin can see assignments to their role and lower rank roles
SELECT isnt_empty(
               $$ SELECT * FROM supamode.role_permission_groups WHERE role_id = kit.test_uuid(203) $$,
               'Regular Admin can view their own role group assignments'
       );

SELECT isnt_empty(
               $$ SELECT * FROM supamode.role_permission_groups WHERE role_id = kit.test_uuid(204) $$,
               'Regular Admin can view group assignments for lower rank roles'
       );

-- But cannot see assignments for higher rank roles
SELECT is_empty(
               $$ SELECT * FROM supamode.role_permission_groups WHERE role_id = kit.test_uuid(201) $$,
               'Regular Admin cannot view group assignments for higher rank roles'
       );

-- Test 14: Super Admin can update permission groups
SELECT kit.authenticate_as('super_admin');

UPDATE supamode.permission_groups
SET description = 'Updated admin group description'
WHERE id = kit.test_uuid(401);

SELECT row_eq(
               $$ SELECT description FROM supamode.permission_groups WHERE id = kit.test_uuid(401) $$,
               ROW('Updated admin group description'::text),
               'Super Admin can update permission groups'
       );

-- Test 15: Permission Manager can update groups they created
SELECT kit.authenticate_as('permission_manager');

UPDATE supamode.permission_groups
SET description = 'Updated manager group description'
WHERE id = kit.test_uuid(402);

SELECT row_eq(
               $$ SELECT description FROM supamode.permission_groups WHERE id = kit.test_uuid(402) $$,
               ROW('Updated manager group description'::text),
               'Permission Manager can update groups they created'
       );

-- Test 16: Permission Manager cannot update groups assigned to higher rank roles
-- The Admin Group is assigned to Super Admin role, so Permission Manager cannot update it
UPDATE supamode.permission_groups
SET description = 'Hacked description'
WHERE id = kit.test_uuid(401);

-- Cannot read the description since Permission Manager cannot update groups assigned to higher rank roles
SELECT is_empty(
               $$ SELECT description FROM supamode.permission_groups WHERE id = kit.test_uuid(401) $$,
               'Permission Manager cannot update groups assigned to higher rank roles (no change)'
       );

-- Test 17: Super Admin can remove permissions from groups assigned to higher rank roles
SELECT kit.authenticate_as('super_admin');

SELECT lives_ok(
               $$ DELETE FROM supamode.permission_group_permissions
       WHERE group_id = kit.test_uuid(401) AND permission_id = kit.test_uuid(312) $$,
               'Super Admin can remove permissions from groups assigned to themselves'
       );
       
SELECT lives_ok(
               $$ DELETE FROM supamode.permission_group_permissions
       WHERE group_id = kit.test_uuid(402) AND permission_id = kit.test_uuid(314) $$,
               'Permission Manager can remove permissions from groups assigned to lower rank roles'
       );

-- Test 19: Users cannot delete groups they are currently members of
-- Permission Manager role is assigned to Manager Group
INSERT INTO supamode.role_permission_groups (role_id, group_id)
VALUES (kit.test_uuid(202), kit.test_uuid(402));  -- Permission Manager role gets Manager Group

select kit.authenticate_as('permission_manager');

DELETE FROM supamode.permission_groups WHERE id = kit.test_uuid(402);

SELECT isnt_empty(
               $$ SELECT * FROM supamode.permission_groups WHERE id = kit.test_uuid(402) $$,
               'Permission Manager cannot delete groups their role is a member of (group still exists)'
       );

-- Test 20: Super Admin can delete groups even if lower rank users are members
SELECT kit.authenticate_as('super_admin');

DELETE FROM supamode.permission_groups WHERE id = kit.test_uuid(402);

SELECT is_empty(
               $$ SELECT * FROM supamode.permission_groups WHERE id = kit.test_uuid(402) $$,
               'Super Admin can delete groups even if lower rank users are members'
       );

-- Test 21: Cascading deletion works correctly
SELECT is_empty(
               $$ SELECT * FROM supamode.role_permission_groups WHERE group_id = kit.test_uuid(402) $$,
               'Group deletion cascades to remove role assignments'
       );

SELECT is_empty(
               $$ SELECT * FROM supamode.permission_group_permissions WHERE group_id = kit.test_uuid(402) $$,
               'Group deletion cascades to remove permission assignments'
       );

-- Test 22: Cannot create groups with duplicate names
SELECT throws_ok(
               $$ INSERT INTO supamode.permission_groups (id, name, description)
       VALUES (kit.test_uuid(404), 'Admin Group', 'Duplicate name') $$,
               'duplicate key value violates unique constraint "permission_groups_name_key"',
               'Cannot create groups with duplicate names'
       );

-- Test 23: Create a new group for testing multiple permissions and roles
INSERT INTO supamode.permission_groups (id, name, description)
VALUES (kit.test_uuid(405), 'Test Group', 'For testing purposes');

-- Add multiple permissions to the group
INSERT INTO supamode.permission_group_permissions (group_id, permission_id) VALUES
                                                                                (kit.test_uuid(405), kit.test_uuid(311)),  -- account_select
                                                                                (kit.test_uuid(405), kit.test_uuid(312)),  -- account_update
                                                                                (kit.test_uuid(405), kit.test_uuid(308)),  -- role_select
                                                                                (kit.test_uuid(405), kit.test_uuid(306));  -- role_update

SELECT is(
               (SELECT COUNT(*)::int FROM supamode.permission_group_permissions WHERE group_id = kit.test_uuid(405)),
               4,
               'Permission group can contain multiple permissions'
       );

-- Test 24: Assign group to multiple roles
INSERT INTO supamode.role_permission_groups (role_id, group_id) VALUES
                                                                    (kit.test_uuid(203), kit.test_uuid(405)),  -- Regular Admin
                                                                    (kit.test_uuid(204), kit.test_uuid(405));  -- Low rank

SELECT is(
               (SELECT COUNT(*)::int FROM supamode.role_permission_groups WHERE group_id = kit.test_uuid(405)),
               2,
               'Permission group can be assigned to multiple roles'
       );

-- Test 25: Users with group access get all permissions in the group
SELECT kit.authenticate_as('low_rank_user');

-- Low rank User should now have account_select permission via the group
SELECT is(
               (SELECT supamode.has_admin_permission('account'::supamode.system_resource, 'select'::supamode.system_action)),
               true,
               'User inherits permissions from permission groups assigned to their role'
       );

-- Test 26: JSON metadata works correctly
SELECT kit.authenticate_as('super_admin');

UPDATE supamode.permission_groups
SET metadata = '{"category": "admin", "risk_level": "high"}'::jsonb
WHERE id = kit.test_uuid(405);

SELECT row_eq(
               $$ SELECT metadata FROM supamode.permission_groups WHERE id = kit.test_uuid(405) $$,
               ROW('{"category": "admin", "risk_level": "high"}'::jsonb),
               'Permission group metadata is stored correctly'
       );

-- Test 27: Group permissions with conditions work
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, conditions)
VALUES (kit.test_uuid(405), kit.test_uuid(313), '{"time_restriction": "business_hours"}'::jsonb);

SELECT row_eq(
               $$ SELECT conditions FROM supamode.permission_group_permissions
       WHERE group_id = kit.test_uuid(405) AND permission_id = kit.test_uuid(313) $$,
               ROW('{"time_restriction": "business_hours"}'::jsonb),
               'Permission group permissions can have conditions'
       );

SELECT finish();

ROLLBACK;