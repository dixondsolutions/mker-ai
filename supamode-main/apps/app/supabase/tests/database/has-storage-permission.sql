-- Test file: has_storage_permission.test.sql
-- Tests supamode.has_storage_permission function through actual operations
-- This tests storage permission management through RLS policies and business rules

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
SELECT kit.create_supabase_user(kit.test_uuid(1), 'storage_admin', 'storageadmin@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(2), 'user_uploader', 'useruploader@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'no_storage_user', 'nostorage@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(4), 'bucket_user', 'bucketuser@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
    (kit.test_uuid(101), kit.test_uuid(1), true),  -- Storage Admin account
    (kit.test_uuid(102), kit.test_uuid(2), true),  -- User Uploader account  
    (kit.test_uuid(103), kit.test_uuid(3), true),  -- No Storage User account
    (kit.test_uuid(104), kit.test_uuid(4), true);  -- Bucket User account

-- Create roles with different priorities
INSERT INTO supamode.roles (id, name, rank, description) VALUES
    (kit.test_uuid(201), 'Storage Admin', 90, 'Full storage administration role'),
    (kit.test_uuid(202), 'User Uploader', 30, 'User-specific upload role'),
    (kit.test_uuid(203), 'No Storage', 10, 'Role with no storage permissions'),
    (kit.test_uuid(204), 'Bucket User', 40, 'Bucket-specific access role');

-- Create storage permissions for testing
INSERT INTO supamode.permissions (id, name, permission_type, scope, action, metadata) VALUES
    -- Full storage admin permissions
    (kit.test_uuid(301), 'storage_all_buckets_all', 'data', 'storage', '*', '{"bucket_name": "*", "path_pattern": "*"}'),
    -- User-specific upload permissions
    (kit.test_uuid(302), 'storage_user_uploads_insert', 'data', 'storage', 'insert', '{"bucket_name": "user-uploads", "path_pattern": "users/{{user_id}}/*"}'),
    (kit.test_uuid(303), 'storage_user_uploads_select', 'data', 'storage', 'select', '{"bucket_name": "user-uploads", "path_pattern": "users/{{user_id}}/*"}'),
    (kit.test_uuid(304), 'storage_user_uploads_update', 'data', 'storage', 'update', '{"bucket_name": "user-uploads", "path_pattern": "users/{{user_id}}/*"}'),
    (kit.test_uuid(305), 'storage_user_uploads_delete', 'data', 'storage', 'delete', '{"bucket_name": "user-uploads", "path_pattern": "users/{{user_id}}/*"}'),
    -- Account-specific permissions
    (kit.test_uuid(306), 'storage_account_files_select', 'data', 'storage', 'select', '{"bucket_name": "account-files", "path_pattern": "accounts/{{account_id}}/*"}'),
    -- Bucket-specific permissions
    (kit.test_uuid(307), 'storage_public_bucket_select', 'data', 'storage', 'select', '{"bucket_name": "public-files", "path_pattern": "*"}'),
    (kit.test_uuid(308), 'storage_public_bucket_insert', 'data', 'storage', 'insert', '{"bucket_name": "public-files", "path_pattern": "uploads/*"}'),
    -- Wildcard bucket permissions
    (kit.test_uuid(309), 'storage_all_buckets_select', 'data', 'storage', 'select', '{"bucket_name": "*", "path_pattern": "public/*"}');

-- Assign roles to accounts
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(201)),  -- Storage Admin
    (kit.test_uuid(102), kit.test_uuid(202)),  -- User Uploader
    (kit.test_uuid(103), kit.test_uuid(203)),  -- No Storage User
    (kit.test_uuid(104), kit.test_uuid(204));  -- Bucket User

-- Grant permissions to roles
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    -- Storage Admin gets full permissions
    (kit.test_uuid(201), kit.test_uuid(301)),  -- All buckets, all actions
    -- User Uploader gets user-specific permissions
    (kit.test_uuid(202), kit.test_uuid(302)),  -- user-uploads insert
    (kit.test_uuid(202), kit.test_uuid(303)),  -- user-uploads select
    (kit.test_uuid(202), kit.test_uuid(304)),  -- user-uploads update
    (kit.test_uuid(202), kit.test_uuid(305)),  -- user-uploads delete
    (kit.test_uuid(202), kit.test_uuid(306)),  -- account-files select
    -- Bucket User gets bucket-specific permissions
    (kit.test_uuid(204), kit.test_uuid(307)),  -- public-files select
    (kit.test_uuid(204), kit.test_uuid(308)),  -- public-files insert (uploads/*)
    (kit.test_uuid(204), kit.test_uuid(309));  -- all buckets select (public/*)

-- Test 1: User without admin access cannot use has_storage_permission
SELECT kit.authenticate_as('no_storage_user');
SELECT kit.set_admin_access('nostorage@test.com', 'false');

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/123/file.jpg')),
    false,
    'User without admin access cannot use has_storage_permission'
);

-- Restore admin access for remaining tests
SELECT kit.set_admin_access('nostorage@test.com', 'true');

-- Test 2: Storage Admin can access all buckets and paths
SELECT kit.authenticate_as('storage_admin');

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/123/file.jpg')),
    true,
    'Storage Admin can select from any bucket and path'
);

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'insert'::supamode.system_action, 'users/456/file.pdf')),
    true,
    'Storage Admin can insert to any bucket and path'
);

SELECT is(
    (SELECT supamode.has_storage_permission('private-bucket', 'delete'::supamode.system_action, 'sensitive/data.txt')),
    true,
    'Storage Admin can delete from any bucket and path'
);

SELECT is(
    (SELECT supamode.has_storage_permission('any-bucket', 'update'::supamode.system_action, 'any/path/file.doc')),
    true,
    'Storage Admin can update any file in any bucket'
);

-- Test 3: User Uploader can access user-specific paths
SELECT kit.authenticate_as('user_uploader');

-- User can access their own user ID path
SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/file.jpg')),
    true,
    'User Uploader can select from their own user path'
);

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'insert'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/document.pdf')),
    true,
    'User Uploader can insert to their own user path'
);

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'update'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/image.png')),
    true,
    'User Uploader can update files in their own user path'
);

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'delete'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/old-file.txt')),
    true,
    'User Uploader can delete files from their own user path'
);

-- Test 4: User Uploader can access account-specific paths
SELECT is(
    (SELECT supamode.has_storage_permission('account-files', 'select'::supamode.system_action, 'accounts/' || kit.test_uuid(102)::text || '/report.pdf')),
    true,
    'User Uploader can select from their own account path'
);

-- Test 5: User Uploader cannot access other users' paths
SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/' || kit.test_uuid(1)::text || '/file.jpg')),
    false,
    'User Uploader cannot select from other users paths'
);

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'insert'::supamode.system_action, 'users/' || kit.test_uuid(3)::text || '/file.jpg')),
    false,
    'User Uploader cannot insert to other users paths'
);

-- Test 6: User Uploader cannot access wrong bucket
SELECT is(
    (SELECT supamode.has_storage_permission('wrong-bucket', 'select'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/file.jpg')),
    false,
    'User Uploader cannot access wrong bucket even with correct path'
);

-- Test 7: User Uploader cannot access account files they don't own
SELECT is(
    (SELECT supamode.has_storage_permission('account-files', 'select'::supamode.system_action, 'accounts/' || kit.test_uuid(101)::text || '/report.pdf')),
    false,
    'User Uploader cannot access other accounts files'
);

-- Test 8: Bucket User has bucket-specific permissions
SELECT kit.authenticate_as('bucket_user');

SELECT is(
    (SELECT supamode.has_storage_permission('public-files', 'select'::supamode.system_action, 'any/path/file.jpg')),
    true,
    'Bucket User can select from public-files bucket'
);

SELECT is(
    (SELECT supamode.has_storage_permission('public-files', 'insert'::supamode.system_action, 'uploads/new-file.pdf')),
    true,
    'Bucket User can insert to uploads path in public-files'
);

-- Test 9: Bucket User cannot insert outside allowed path pattern
SELECT is(
    (SELECT supamode.has_storage_permission('public-files', 'insert'::supamode.system_action, 'restricted/file.pdf')),
    false,
    'Bucket User cannot insert outside uploads path pattern'
);

-- Test 10: Bucket User can access public paths via wildcard permission
SELECT is(
    (SELECT supamode.has_storage_permission('any-bucket', 'select'::supamode.system_action, 'public/shared-file.jpg')),
    true,
    'Bucket User can select public paths from any bucket via wildcard'
);

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'public/announcement.pdf')),
    true,
    'Bucket User can select public paths from user-uploads via wildcard'
);

-- Test 11: Bucket User cannot access non-public paths via wildcard
SELECT is(
    (SELECT supamode.has_storage_permission('any-bucket', 'select'::supamode.system_action, 'private/secret.txt')),
    false,
    'Bucket User cannot access non-public paths via wildcard'
);

-- Test 12: No Storage User has no permissions
SELECT kit.authenticate_as('no_storage_user');

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/123/file.jpg')),
    false,
    'No Storage User cannot select from any bucket'
);

SELECT is(
    (SELECT supamode.has_storage_permission('public-files', 'select'::supamode.system_action, 'public/file.jpg')),
    false,
    'No Storage User cannot select even from public paths'
);

-- Test 13: Invalid parameters return false
SELECT kit.authenticate_as('storage_admin');

SELECT is(
    (SELECT supamode.has_storage_permission(NULL, 'select'::supamode.system_action, 'users/123/file.jpg')),
    false,
    'Function returns false for NULL bucket name'
);

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, NULL)),
    false,
    'Function returns false for NULL object path'
);

-- Test 14: Empty string parameters return false
SELECT is(
    (SELECT supamode.has_storage_permission('', 'select'::supamode.system_action, 'users/123/file.jpg')),
    false,
    'Function returns false for empty bucket name'
);

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, '')),
    false,
    'Function returns false for empty object path'
);

-- Test 15: Function respects role assignment validity
SET ROLE postgres;

-- Remove constraint to allow invalid role assignment
ALTER TABLE supamode.account_roles DROP CONSTRAINT valid_time_range;

UPDATE supamode.account_roles 
SET valid_until = now() - interval '1 second'
WHERE account_id = kit.test_uuid(102);

SELECT kit.authenticate_as('user_uploader');

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/file.jpg')),
    false,
    'User Uploader loses permissions when role assignment expires'
);

-- Restore role assignment
SET ROLE postgres;

UPDATE supamode.account_roles 
SET valid_until = NULL
WHERE account_id = kit.test_uuid(102);

-- Test 16: Function respects permission validity
-- Expire a permission and verify it's no longer accessible
ALTER TABLE supamode.role_permissions DROP CONSTRAINT valid_time_range;

UPDATE supamode.role_permissions 
SET valid_until = now() - interval '1 second'
WHERE role_id = kit.test_uuid(202) AND permission_id = kit.test_uuid(302);

SELECT kit.authenticate_as('user_uploader');

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'insert'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/file.jpg')),
    false,
    'User Uploader loses insert permission when it expires'
);

-- But other permissions should still work
SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/file.jpg')),
    true,
    'User Uploader retains other valid permissions'
);

-- Restore permission
UPDATE supamode.role_permissions 
SET valid_until = NULL
WHERE role_id = kit.test_uuid(202) AND permission_id = kit.test_uuid(302);

-- Test 17: Path pattern matching with nested directories
SELECT kit.authenticate_as('user_uploader');

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/documents/subfolder/file.pdf')),
    true,
    'User can access nested directories within their path pattern'
);

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/images/profile/avatar.jpg')),
    true,
    'User can access deeply nested directories within their path pattern'
);

-- Test 18: Case sensitivity for bucket names and paths
SELECT kit.authenticate_as('bucket_user');

SELECT is(
    (SELECT supamode.has_storage_permission('PUBLIC-FILES', 'select'::supamode.system_action, 'any/path/file.jpg')),
    false,
    'Function is case sensitive for bucket names'
);

SELECT is(
    (SELECT supamode.has_storage_permission('public-files', 'select'::supamode.system_action, 'PUBLIC/file.jpg')),
    true,
    'Function is case insensitive for path patterns'
);

-- Test 19: Multiple valid permission paths
SET ROLE postgres;

-- Create an additional permission that would also grant access
INSERT INTO supamode.permissions (id, name, permission_type, scope, action, metadata) VALUES
    (kit.test_uuid(310), 'alternate_user_uploads_select', 'data', 'storage', 'select', ('{"bucket_name": "user-uploads", "path_pattern": "users/' || kit.test_uuid(2)::text || '/*"}')::jsonb);

INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    (kit.test_uuid(202), kit.test_uuid(310));

SELECT kit.authenticate_as('user_uploader');

SELECT is(
    (SELECT supamode.has_storage_permission('user-uploads', 'select'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/file.jpg')),
    true,
    'User has access via multiple permission paths'
);

-- Test 20: Complex path patterns with mixed variables
SET ROLE postgres;

-- Create permission with mixed variable substitution
INSERT INTO supamode.permissions (id, name, permission_type, scope, action, metadata) VALUES
    (kit.test_uuid(311), 'mixed_pattern_permission', 'data', 'storage', 'select', '{"bucket_name": "mixed-bucket", "path_pattern": "users/{{user_id}}/accounts/{{account_id}}/files/*"}'::jsonb);

INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    (kit.test_uuid(202), kit.test_uuid(311));

SELECT kit.authenticate_as('user_uploader');

SELECT is(
    (SELECT supamode.has_storage_permission('mixed-bucket', 'select'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/accounts/' || kit.test_uuid(102)::text || '/files/document.pdf')),
    true,
    'User can access files with mixed variable substitution in path pattern'
);

SELECT is(
    (SELECT supamode.has_storage_permission('mixed-bucket', 'select'::supamode.system_action, 'users/' || kit.test_uuid(1)::text || '/accounts/' || kit.test_uuid(102)::text || '/files/document.pdf')),
    false,
    'User cannot access files with wrong user_id in mixed pattern'
);

SELECT is(
    (SELECT supamode.has_storage_permission('mixed-bucket', 'select'::supamode.system_action, 'users/' || kit.test_uuid(2)::text || '/accounts/' || kit.test_uuid(101)::text || '/files/document.pdf')),
    false,
    'User cannot access files with wrong account_id in mixed pattern'
);

SELECT finish();

ROLLBACK;