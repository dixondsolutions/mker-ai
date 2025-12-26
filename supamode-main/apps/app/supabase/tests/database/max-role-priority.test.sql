-- Test file: get_user_max_role_rank.test.sql
-- Tests supamode.get_user_max_role_rank function
-- This function is critical for role hierarchy-based security decisions
-- NOTE: Each account can only have ONE role assigned due to unique constraint

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
SELECT kit.create_supabase_user(kit.test_uuid(2), 'manager_user', 'manager@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'regular_user', 'regular@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(4), 'no_role_user', 'nouser@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(5), 'role_change_user', 'rolechange@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
                                                                (kit.test_uuid(101), kit.test_uuid(1), true),  -- Super Admin account
                                                                (kit.test_uuid(102), kit.test_uuid(2), true),  -- Manager User account
                                                                (kit.test_uuid(103), kit.test_uuid(3), true),  -- Regular User account
                                                                (kit.test_uuid(104), kit.test_uuid(4), true),  -- No Role User account
                                                                (kit.test_uuid(105), kit.test_uuid(5), true);  -- Role Change User account

-- Create roles with different priorities
INSERT INTO supamode.roles (id, name, rank, description) VALUES
                                                                 (kit.test_uuid(201), 'Super Admin', 100, 'Highest rank role'),
                                                                 (kit.test_uuid(202), 'Senior Manager', 80, 'High rank management role'),
                                                                 (kit.test_uuid(203), 'Manager', 60, 'Mid-level management role'),
                                                                 (kit.test_uuid(204), 'Team Lead', 40, 'Team leadership role'),
                                                                 (kit.test_uuid(205), 'Senior User', 30, 'Senior user role'),
                                                                 (kit.test_uuid(206), 'Regular User', 20, 'Standard user role'),
                                                                 (kit.test_uuid(207), 'Guest', 10, 'Lowest rank role'),
                                                                 (kit.test_uuid(208), 'Zero rank', 0, 'Zero rank role'),
                                                                 (kit.test_uuid(209), 'High rank Test', 95, 'High rank test role'),
                                                                 (kit.test_uuid(210), 'Mid rank Test', 50, 'Mid rank test role');

-- Authenticate as super admin for testing
SELECT kit.authenticate_as('super_admin');

-- Test 1: NULL input returns NULL
SELECT is(
               supamode.get_user_max_role_rank(NULL),
               NULL,
               'Function returns NULL for NULL input'
       );

-- Test 2: Nonexistent account returns NULL
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(999)),
               NULL,
               'Function returns NULL for nonexistent account'
       );

-- Test 3: Account with no roles returns NULL
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(104)),
               NULL,
               'Function returns NULL for account with no roles'
       );

-- Test 4: Single role assignment returns correct rank (highest rank)
set role postgres;
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(201));  -- Super Admin (rank 100)

SELECT kit.authenticate_as('super_admin');

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(101)),
               100,
               'Function returns correct rank for Super Admin role (100)'
       );

-- Test 5: Different role assignment returns different rank
set role postgres;
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(102), kit.test_uuid(203));  -- Manager (rank 60)

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(102)),
               60,
               'Function returns correct rank for Manager role (60)'
       );

-- Test 6: Low rank role
set role postgres;
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(103), kit.test_uuid(206));  -- Regular User (rank 20)

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(103)),
               20,
               'Function returns correct rank for Regular User role (20)'
       );

-- Test 7: Lowest rank role (0)
set role postgres;
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(105), kit.test_uuid(208));  -- Zero rank (rank 0)

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               0,
               'Function returns correct rank for zero rank role'
       );

-- Test 8: Cannot assign multiple roles (unique constraint)
SELECT throws_ok(
               $$ INSERT INTO supamode.account_roles (account_id, role_id) VALUES
       (kit.test_uuid(101), kit.test_uuid(202)) $$
       );

-- Test 9: Role change updates result
-- Change user from Zero rank to High rank
set role postgres;
UPDATE supamode.account_roles
SET role_id = kit.test_uuid(209)  -- High rank Test (rank 95)
WHERE account_id = kit.test_uuid(105);

SELECT kit.authenticate_as('super_admin');

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               95,
               'Function returns updated rank after role change'
       );

-- Test 10: Removing role returns NULL
set role postgres;
DELETE FROM supamode.account_roles
WHERE account_id = kit.test_uuid(105);

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               NULL,
               'Function returns NULL after removing role'
       );

-- Test 11: Role rank changes affect result
-- First assign a role
set role postgres;
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(105), kit.test_uuid(210));  -- Mid rank Test (rank 50)

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               50,
               'Function returns correct rank before role rank change'
       );

-- Change the role's rank
set role postgres;
UPDATE supamode.roles
SET rank = 75
WHERE id = kit.test_uuid(210);

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               75,
               'Function returns updated rank after role rank change'
       );

-- Test 12: All different rank levels work correctly
-- Test each major rank level
set role postgres;
DELETE FROM supamode.account_roles WHERE account_id = kit.test_uuid(105);

-- rank 100
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(105), kit.test_uuid(201));  -- Super Admin (100)

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               100,
               'rank 100 works correctly'
       );

-- Change to rank 80
set role postgres;
UPDATE supamode.account_roles
SET role_id = kit.test_uuid(202)  -- Senior Manager (80)
WHERE account_id = kit.test_uuid(105);

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               80,
               'rank 80 works correctly'
       );

-- Change to rank 40
set role postgres;
UPDATE supamode.account_roles
SET role_id = kit.test_uuid(204)  -- Team Lead (40)
WHERE account_id = kit.test_uuid(105);

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               40,
               'rank 40 works correctly'
       );

-- Change to rank 10
set role postgres;
UPDATE supamode.account_roles
SET role_id = kit.test_uuid(207)  -- Guest (10)
WHERE account_id = kit.test_uuid(105);

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               10,
               'rank 10 works correctly'
       );

-- Test 13: Multiple users with different roles
SELECT kit.authenticate_as('manager_user');

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(101)),
               100,
               'User 1 still has rank 100'
       );

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(102)),
               60,
               'User 2 still has rank 60'
       );

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(103)),
               20,
               'User 3 still has rank 20'
       );

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(104)),
               NULL,
               'User 4 still has no role (NULL)'
       );

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               10,
               'User 5 has rank 10 after changes'
       );

-- Test 14: Function consistency (multiple calls return same result)
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(101)),
               100,
               'Function consistency: First call returns 100'
       );

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(101)),
               100,
               'Function consistency: Second call returns 100'
       );

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(102)),
               60,
               'Function consistency: Different user returns 60'
       );

SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(101)),
               100,
               'Function consistency: Back to first user still returns 100'
       );

-- Test 15: Role deletion affects result immediately
set role postgres;
DELETE FROM supamode.roles WHERE id = kit.test_uuid(201);  -- Delete Super Admin role

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(101)),
               NULL,
               'Role deletion: Function returns NULL when assigned role is deleted'
       );

-- Test 16: Account deletion cleanup (role assignments should cascade)
set role postgres;
DELETE FROM supamode.accounts WHERE id = kit.test_uuid(105);

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(105)),
               NULL,
               'Account deletion: Function returns NULL for deleted account'
       );

-- Test 17: Inactive account still returns rank (function doesn't check is_active)
set role postgres;
UPDATE supamode.accounts
SET is_active = false
WHERE id = kit.test_uuid(102);

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(102)),
               60,
               'Inactive account: Function still returns rank (does not check is_active)'
       );

-- Test 18: Edge case - rank boundary values
-- Create edge case roles
set role postgres;
INSERT INTO supamode.roles (id, name, rank) VALUES
                                                    (kit.test_uuid(211), 'rank 1', 1),
                                                    (kit.test_uuid(212), 'rank 99', 99);

-- Test rank 1
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(211));  -- rank 1

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(101)),
               1,
               'Edge case: rank 1 works correctly'
       );

-- Test rank 99
set role postgres;
UPDATE supamode.account_roles
SET role_id = kit.test_uuid(212)  -- rank 99
WHERE account_id = kit.test_uuid(101);

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(101)),
               99,
               'Edge case: rank 99 works correctly'
       );

-- Test 19: Reassigning same role doesn't break anything
set role postgres;
UPDATE supamode.account_roles
SET role_id = kit.test_uuid(212)  -- Same role (rank 99)
WHERE account_id = kit.test_uuid(101);

SELECT kit.authenticate_as('super_admin');
SELECT is(
               supamode.get_user_max_role_rank(kit.test_uuid(101)),
               99,
               'Reassigning same role: rank remains correct'
       );

-- Test 20: Role with same rank as existing
set role postgres;

-- Should not be able to create due to unique rank constraint
SELECT throws_ok(
               $$ INSERT INTO supamode.roles (id, name, rank) VALUES
       (kit.test_uuid(214), 'Duplicate rank 99', 99) $$
       );

SELECT finish();

ROLLBACK;