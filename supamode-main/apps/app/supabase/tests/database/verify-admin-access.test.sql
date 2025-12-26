-- Test file: verify_admin_access.test.sql
-- Tests supamode.verify_admin_access function through actual operations
-- This tests the foundational security function used throughout the system

BEGIN;
CREATE EXTENSION "basejump-supabase_test_helpers" VERSION '0.0.6';

SELECT no_plan();

-- Clean up any existing test data
DELETE FROM supamode.configuration;
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
SELECT kit.create_supabase_user(kit.test_uuid(1), 'admin_user', 'admin@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(2), 'non_admin_user', 'user@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'mfa_user', 'mfa@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(4), 'config_test_user', 'config@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
                                                                (kit.test_uuid(101), kit.test_uuid(1), true),  -- Admin User account
                                                                (kit.test_uuid(102), kit.test_uuid(2), true),  -- Non-Admin User account
                                                                (kit.test_uuid(103), kit.test_uuid(3), true),  -- MFA User account
                                                                (kit.test_uuid(104), kit.test_uuid(4), true);  -- Config Test User account

-- Create a basic role for testing
INSERT INTO supamode.roles (id, name, rank, description) VALUES
    (kit.test_uuid(201), 'Test Role', 50, 'Basic test role');

-- Create a basic permission for testing
INSERT INTO supamode.permissions (id, name, permission_type, system_resource, action) VALUES
    (kit.test_uuid(301), 'role_select', 'system', 'role', 'select');

-- Assign role to admin user
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(201));

-- Grant permission to role
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    (kit.test_uuid(201), kit.test_uuid(301));

-- Test 1: User without admin access cannot access admin functions
SELECT kit.authenticate_as('non_admin_user');
SELECT kit.set_admin_access('user@test.com', 'false');

-- Try to view roles (requires admin access)
SELECT is_empty(
               $$ SELECT * FROM supamode.roles $$,
               'User without admin access cannot view roles'
       );

-- Direct function call should return false
SELECT is(
               (SELECT supamode.verify_admin_access()),
               false,
               'verify_admin_access returns false for user without admin access'
       );

-- Test 2: User with admin access but no MFA requirement can access admin functions
SELECT kit.authenticate_as('admin_user');
SELECT kit.set_admin_access('admin@test.com', 'true');

-- Set configuration to not require MFA
set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

SELECT kit.authenticate_as('admin_user');

-- Should be able to access admin functions
SELECT isnt_empty(
               $$ SELECT * FROM supamode.roles $$,
               'User with admin access can view roles when MFA not required'
       );

-- Direct function call should return true
SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'verify_admin_access returns true for admin user when MFA not required'
       );

-- Test 3: Admin user without aal2 cannot access when MFA is required
set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- User has admin access but no aal2
SELECT kit.authenticate_as('admin_user');

SELECT is_empty(
               $$ SELECT * FROM supamode.accounts $$,
               'Admin user without aal2 cannot view accounts when MFA required'
       );

-- Direct function call should return false
SELECT is(
               (SELECT supamode.verify_admin_access()),
               false,
               'verify_admin_access returns false for admin user without aal2 when MFA required'
       );

-- Test 4: Admin user with aal2 can access when MFA is required
SELECT kit.set_session_aal('aal2');

SELECT isnt_empty(
               $$ SELECT * FROM supamode.roles $$,
               'Admin user with aal2 can view roles when MFA required'
       );

-- Direct function call should return true
SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'verify_admin_access returns true for admin user with aal2 when MFA required'
       );

-- Test 5: Function handles missing MFA configuration correctly (defaults to true)
set role postgres;
DELETE FROM supamode.configuration WHERE key = 'requires_mfa';

-- Without aal2, should not fail (defaults to not requiring MFA)
select kit.authenticate_as('admin_user');
SELECT kit.set_session_aal('aal1');

SELECT isnt_empty(
               $$ SELECT * FROM supamode.roles $$,
               'Admin user without aal2 cannot access when MFA config missing (defaults to required)'
       );

-- Direct function call should return false
SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'verify_admin_access returns false when MFA config missing and no aal2'
       );

-- With aal2, should succeed
SELECT kit.set_session_aal('aal2');

SELECT isnt_empty(
               $$ SELECT * FROM supamode.roles $$,
               'Admin user with aal2 can access when MFA config missing'
       );

-- Direct function call should return true
SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'verify_admin_access returns true when MFA config missing but has aal2'
       );

-- Test 6: Invalid MFA configuration value defaults to requiring MFA
set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'invalid_value')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Should default to requiring MFA, so without aal2 should fail
SELECT kit.authenticate_as('admin_user');
SELECT kit.set_session_aal('aal1');

SELECT is_empty(
               $$ SELECT * FROM supamode.roles $$,
               'Invalid MFA config defaults to requiring MFA (access denied without aal2)'
       );

-- Direct function call should return false
SELECT is(
               (SELECT supamode.verify_admin_access()),
               false,
               'verify_admin_access returns false with invalid MFA config and no aal2'
       );

-- With aal2, should succeed
SELECT kit.set_session_aal('aal2');

SELECT isnt_empty(
               $$ SELECT * FROM supamode.roles $$,
               'Invalid MFA config allows access with aal2'
       );

-- Direct function call should return true
SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'verify_admin_access returns true with invalid MFA config but has aal2'
       );

-- Test 7: Function works correctly across different admin-protected resources
-- Reset to not require MFA for simpler testing
set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Authenticate as admin user
SELECT kit.authenticate_as('admin_user');
SELECT kit.set_session_aal('aal1');

-- Test access to various admin-protected resources
SELECT isnt_empty(
               $$ SELECT * FROM supamode.permissions $$,
               'Admin user can view permissions'
       );

SELECT isnt_empty(
               $$ SELECT * FROM supamode.accounts $$,
               'Admin user can view accounts'
       );

-- Test with non-admin user
SELECT kit.authenticate_as('non_admin_user');
SELECT kit.set_admin_access('user@test.com', 'false');

SELECT is_empty(
               $$ SELECT * FROM supamode.permissions $$,
               'Non-admin user cannot view permissions'
       );

SELECT is_empty(
               $$ SELECT * FROM supamode.accounts $$,
               'Non-admin user cannot view accounts'
       );

-- Test 8: Function correctly handles edge cases with aal levels
SELECT kit.authenticate_as('mfa_user');
SELECT kit.set_admin_access('mfa@test.com', 'true');

-- Test with missing aal (should be treated as aal1)
SET ROLE postgres;
-- Simulate missing aal by setting it to null/empty
SELECT set_config('request.jwt.claims', json_build_object(
        'sub', kit.test_uuid(3),
        'email', 'mfa@test.com',
        'app_metadata', json_build_object('supamode_access', 'true')
                                        )::text, true);


INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Should fail without aal2
SELECT kit.authenticate_as('mfa_user');

SELECT is(
               (SELECT supamode.verify_admin_access()),
               false,
               'verify_admin_access returns false with missing aal when MFA required'
       );

-- Test 9: Function works with case variations in configuration
set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Should still require MFA (case sensitive)
SELECT kit.authenticate_as('admin_user');
SELECT is(
               (SELECT supamode.verify_admin_access()),
               false,
               'verify_admin_access treats "TRUE" as invalid (case sensitive)'
       );

set role postgres;

-- Test correct case
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'verify_admin_access works with correct case "false"'
       );

-- Test 11: Function state doesn't leak between users
SELECT kit.authenticate_as('admin_user');
SELECT kit.set_admin_access('admin@test.com', 'true');

set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

select kit.authenticate_as('admin_user');
SELECT kit.set_session_aal('aal1');
-- Admin user should have access
SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'Admin user has access'
       );

-- Switch to non-admin user
SELECT kit.authenticate_as('non_admin_user');
SELECT kit.set_admin_access('user@test.com', 'false');

SELECT is(
               (SELECT supamode.verify_admin_access()),
               false,
               'Non-admin user state is independent of previous admin user'
       );

-- Switch back to admin user
SELECT kit.authenticate_as('admin_user');

SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'Admin user still has access after switching users'
       );

-- Test 12: Configuration changes take effect immediately
set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Authenticate as admin user
SELECT kit.authenticate_as('admin_user');
SELECT kit.set_session_aal('aal1');

SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'Admin user has access when MFA not required'
       );

-- Change configuration to require MFA
set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- Admin user should lose access immediately
SELECT kit.authenticate_as('admin_user');
SELECT is(
               (SELECT supamode.verify_admin_access()),
               false,
               'Admin user loses access immediately when MFA requirement changes'
       );

-- Test 13: Empty string configuration values are treated as invalid
set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', '')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Test with aal1
SELECT kit.authenticate_as('admin_user');
SELECT kit.set_session_aal('aal1');

SELECT is(
               (SELECT supamode.verify_admin_access()),
               false,
               'Empty string MFA config defaults to requiring MFA'
       );

-- Test with aal2
SELECT kit.set_session_aal('aal2');

SELECT is(
               (SELECT supamode.verify_admin_access()),
               true,
               'Empty string MFA config allows access with aal2'
       );

-- Test 14: Whitespace-only configuration values are treated as invalid
set role postgres;
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', '   ')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Test with aal1
SELECT kit.authenticate_as('admin_user');
SELECT kit.set_session_aal('aal1');

SELECT is(
               (SELECT supamode.verify_admin_access()),
               false,
               'Whitespace-only MFA config defaults to requiring MFA'
       );

SELECT finish();

ROLLBACK;