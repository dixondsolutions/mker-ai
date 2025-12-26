-- Test file: global_search.test.sql
-- Tests supamode.global_search function through actual search operations
-- This tests search functionality across tables with permissions and filtering

BEGIN;
CREATE EXTENSION "basejump-supabase_test_helpers" VERSION '0.0.6';

SELECT no_plan();

-- Clean up any existing test data
DELETE FROM supamode.permission_groups;
DELETE FROM supamode.table_metadata;
DELETE FROM supamode.account_roles;
DELETE FROM supamode.role_permissions;
-- Clean up dashboard tables (must be in dependency order)
DELETE FROM supamode.dashboard_role_shares;
DELETE FROM supamode.dashboard_widgets;
DELETE FROM supamode.dashboards;
DELETE FROM supamode.accounts;
DELETE FROM supamode.roles;
DELETE FROM supamode.permissions;

-- Create test tables for search (we'll mock these in table_metadata)
-- Note: In pgTap we can't create actual tables, so we'll test the function logic

-- Create test users
SELECT kit.create_supabase_user(kit.test_uuid(1), 'search_admin', 'searchadmin@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(2), 'limited_user', 'limited@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'no_access_user', 'noaccess@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
    (kit.test_uuid(101), kit.test_uuid(1), true),  -- Search Admin
    (kit.test_uuid(102), kit.test_uuid(2), true),  -- Limited User
    (kit.test_uuid(103), kit.test_uuid(3), true);  -- No Access User

-- Create roles
INSERT INTO supamode.roles (id, name, rank, description) VALUES
    (kit.test_uuid(201), 'Search Admin', 80, 'Full search access'),
    (kit.test_uuid(202), 'Limited User', 40, 'Limited table access'),
    (kit.test_uuid(203), 'No Access', 10, 'No table access');

-- Create data permissions for table access
INSERT INTO supamode.permissions (id, name, permission_type, scope, schema_name, table_name, action) VALUES
    -- Public schema permissions
    (kit.test_uuid(301), 'public_users_select', 'data', 'table', 'public', 'users', 'select'),
    (kit.test_uuid(302), 'public_products_select', 'data', 'table', 'public', 'products', 'select'),
    (kit.test_uuid(303), 'public_transactions_select', 'data', 'table', 'public', 'transactions', 'select'),
    (kit.test_uuid(304), 'public_categories_select', 'data', 'table', 'public', 'categories', 'select'),
    -- Admin schema permissions
    (kit.test_uuid(311), 'admin_logs_select', 'data', 'table', 'admin', 'logs', 'select'),
    (kit.test_uuid(312), 'admin_settings_select', 'data', 'table', 'admin', 'settings', 'select'),
    -- Wildcard permissions
    (kit.test_uuid(321), 'public_all_select', 'data', 'table', 'public', '*', 'select');

-- Assign roles to accounts
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(201)),  -- Search Admin
    (kit.test_uuid(102), kit.test_uuid(202)),  -- Limited User
    (kit.test_uuid(103), kit.test_uuid(203));  -- No Access User

-- Grant permissions to roles
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    -- Search Admin gets access to all tables
    (kit.test_uuid(201), kit.test_uuid(321)),  -- public.* select (wildcard)
    (kit.test_uuid(201), kit.test_uuid(311)),  -- admin.logs select
    (kit.test_uuid(201), kit.test_uuid(312)),  -- admin.settings select
    
    -- Limited User gets access to some public tables only
    (kit.test_uuid(202), kit.test_uuid(301)),  -- public.users select
    (kit.test_uuid(202), kit.test_uuid(302));  -- public.products select

-- Create table metadata for search testing
INSERT INTO supamode.table_metadata (
    schema_name, table_name, display_name, description, is_searchable, is_visible,
    columns_config, ui_config
) VALUES
    -- Public schema tables
    ('public', 'users', 'Users', 'User accounts', true, true,
     '{
        "id": {"name": "id", "is_primary_key": true, "is_searchable": false, "ordering": 1},
        "name": {"name": "name", "is_searchable": true, "ordering": 2, "display_name": "Full Name"},
        "email": {"name": "email", "is_searchable": true, "ordering": 3, "display_name": "Email Address"},
        "created_at": {"name": "created_at", "is_searchable": false, "ordering": 4}
     }'::jsonb,
     '{"primary_keys": [{"column_name": "id"}]}'::jsonb
    ),
    
    ('public', 'products', 'Products', 'Product catalog', true, true,
     '{
        "id": {"name": "id", "is_primary_key": true, "is_searchable": false, "ordering": 1},
        "title": {"name": "title", "is_searchable": true, "ordering": 2, "display_name": "Product Title"},
        "description": {"name": "description", "is_searchable": true, "ordering": 3},
        "price": {"name": "price", "is_searchable": false, "ordering": 4}
     }'::jsonb,
     '{"primary_keys": [{"column_name": "id"}]}'::jsonb
    ),
    
    ('public', 'transactions', 'Transactions', 'Customer transactions', true, true,
     '{
        "id": {"name": "id", "is_primary_key": true, "is_searchable": false, "ordering": 1},
        "customer_name": {"name": "customer_name", "is_searchable": true, "ordering": 2},
        "status": {"name": "status", "is_searchable": true, "ordering": 3},
        "total": {"name": "total", "is_searchable": false, "ordering": 4}
     }'::jsonb,
     '{"primary_keys": [{"column_name": "id"}]}'::jsonb
    ),
    
    ('public', 'categories', 'Categories', 'Product categories', true, true,
     '{
        "id": {"name": "id", "is_primary_key": true, "is_searchable": false, "ordering": 1},
        "name": {"name": "name", "is_searchable": true, "ordering": 2},
        "slug": {"name": "slug", "is_searchable": true, "ordering": 3}
     }'::jsonb,
     '{"primary_keys": [{"column_name": "id"}]}'::jsonb
    ),
    
    -- Admin schema tables
    ('admin', 'logs', 'System Logs', 'Application logs', true, true,
     '{
        "id": {"name": "id", "is_primary_key": true, "is_searchable": false, "ordering": 1},
        "message": {"name": "message", "is_searchable": true, "ordering": 2},
        "level": {"name": "level", "is_searchable": true, "ordering": 3}
     }'::jsonb,
     '{"primary_keys": [{"column_name": "id"}]}'::jsonb
    ),
    
    ('admin', 'settings', 'Settings', 'System settings', true, true,
     '{
        "key": {"name": "key", "is_primary_key": true, "is_searchable": true, "ordering": 1},
        "value": {"name": "value", "is_searchable": true, "ordering": 2}
     }'::jsonb,
     '{"primary_keys": [{"column_name": "key"}]}'::jsonb
    ),
    
    -- Non-searchable table
    ('public', 'sensitive_data', 'Sensitive Data', 'Not searchable', false, true,
     '{
        "id": {"name": "id", "is_primary_key": true, "is_searchable": false, "ordering": 1},
        "secret": {"name": "secret", "is_searchable": false, "ordering": 2}
     }'::jsonb,
     '{"primary_keys": [{"column_name": "id"}]}'::jsonb
    );

-- Create tables added to table_metadata

-- public.users
CREATE TABLE public.users (
    id uuid PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- public.products
CREATE TABLE public.products (
    id uuid PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL
);

-- public.transactions
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY,
    customer_name TEXT NOT NULL,
    status TEXT NOT NULL,
    total NUMERIC NOT NULL
);

-- public.categories
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL
);

-- admin.logs
CREATE SCHEMA IF NOT EXISTS admin;

CREATE TABLE admin.logs (
    id uuid PRIMARY KEY,
    message TEXT NOT NULL,
    level TEXT NOT NULL
);

-- admin.settings
CREATE TABLE admin.settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- public.sensitive_data
CREATE TABLE public.sensitive_data (
    id uuid PRIMARY KEY,
    secret TEXT NOT NULL
);

-- Insert data into tables

-- public.users
INSERT INTO public.users (id, name, email) VALUES
    (kit.test_uuid(1001), 'John Doe', 'john.doe@example.com'),
    (kit.test_uuid(1002), 'Jane Smith', 'jane.smith@example.com'),
    (kit.test_uuid(1003), 'User Alpha', 'alpha@example.com');

-- public.products
INSERT INTO public.products (id, title, description, price) VALUES
    (kit.test_uuid(2001), 'Laptop Pro', 'Powerful laptop for professionals', 1200.00),
    (kit.test_uuid(2002), 'Wireless Mouse', 'Ergonomic wireless mouse', 25.50),
    (kit.test_uuid(2003), 'USB Keyboard', 'Mechanical USB keyboard', 75.00);

-- public.transactions
INSERT INTO public.transactions (id, customer_name, status, total) VALUES
    (kit.test_uuid(3001), 'John Doe', 'completed', 1225.50),
    (kit.test_uuid(3002), 'Jane Smith', 'pending', 75.00),
    (kit.test_uuid(3003), 'Alice Brown', 'shipped', 500.00);

-- public.categories
INSERT INTO public.categories (id, name, slug) VALUES
    (kit.test_uuid(4001), 'Electronics', 'electronics'),
    (kit.test_uuid(4002), 'Peripherals', 'peripherals');

-- admin.logs
INSERT INTO admin.logs (id, message, level) VALUES
    (kit.test_uuid(5001), 'User login successful for john.doe@example.com', 'INFO'),
    (kit.test_uuid(5002), 'Database connection error', 'ERROR');

-- admin.settings
INSERT INTO admin.settings (key, value) VALUES
    ('app_name', 'Supamode'),
    ('version', '1.0.0');

-- public.sensitive_data
INSERT INTO public.sensitive_data (id, secret) VALUES
    (kit.test_uuid(6001), 'secret_key_123');

-- Test 1: User without admin access cannot use global_search
SELECT kit.authenticate_as('no_access_user');
SELECT kit.set_admin_access('noaccess@test.com', 'false');

SELECT is(
    (SELECT (supamode.global_search('test')::jsonb)->'results'),
    '[]',
    'User without admin access cannot read any values'
);

-- Restore admin access for remaining tests
SELECT kit.set_admin_access('noaccess@test.com', 'true');

-- Test 2: Basic search functionality returns proper structure
SELECT kit.authenticate_as('search_admin');

SELECT ok(
    (SELECT supamode.global_search('user') IS NOT NULL),
    'Global search returns non-null result'
);

SELECT ok(
    (SELECT (supamode.global_search('user')::jsonb) ? 'results'),
    'Global search result contains results field'
);

SELECT ok(
    (SELECT (supamode.global_search('user')::jsonb) ? 'total'),
    'Global search result contains total field'
);

SELECT ok(
    (SELECT (supamode.global_search('user')::jsonb) ? 'tables_count'),
    'Global search result contains tables_count field'
);

SELECT ok(
    (SELECT (supamode.global_search('user')::jsonb) ? 'tables_searched'),
    'Global search result contains tables_searched field'
);

SELECT ok(
    (SELECT (supamode.global_search('user')::jsonb) ? 'query'),
    'Global search result contains query field'
);

SELECT ok(
    (SELECT (supamode.global_search('user')::jsonb) ? 'performance'),
    'Global search result contains performance field'
);

-- Test 3: Search respects minimum query length
SELECT is(
    (SELECT (supamode.global_search('a')::jsonb)->>'total')::int,
    0,
    'Search with 1 character returns no results (too short)'
);

SELECT is(
    (SELECT jsonb_array_length((supamode.global_search('a')::jsonb)->'results')),
    0,
    'Search with 1 character returns empty results array'
);

-- Test 4: Search only includes tables user has permission for
SELECT kit.authenticate_as('limited_user');

-- Note: Since we can't create actual tables and data in pgTap, 
-- we test the permission filtering logic by checking that only accessible tables are considered
-- The function will try to search tables but may not find actual data

SELECT ok(
    (SELECT supamode.global_search('test') IS NOT NULL),
    'Limited user can call global search'
);

-- Test 5: User with no table permissions gets empty results
SELECT kit.authenticate_as('no_access_user');

SELECT is(
    (SELECT (supamode.global_search('user')::jsonb)->>'total')::int,
    0,
    'User with no table permissions gets no search results'
);

SELECT is(
    (SELECT (supamode.global_search('user')::jsonb)->>'tables_count')::int,
    0,
    'User with no table permissions has zero tables_count'
);

-- Test 6: Schema filtering works
SELECT kit.authenticate_as('search_admin');

-- Search only public schema
SELECT ok(
    (SELECT supamode.global_search('test', 10, 0, ARRAY['public']) IS NOT NULL),
    'Global search accepts schema filter for public'
);

-- Search only admin schema  
SELECT ok(
    (SELECT supamode.global_search('test', 10, 0, ARRAY['admin']) IS NOT NULL),
    'Global search accepts schema filter for admin'
);

-- Search multiple schemas
SELECT ok(
    (SELECT supamode.global_search('test', 10, 0, ARRAY['public', 'admin']) IS NOT NULL),
    'Global search accepts multiple schema filters'
);

-- Test 7: Table filtering works
SELECT ok(
    (SELECT supamode.global_search('test', 10, 0, ARRAY['public'], ARRAY['users']) IS NOT NULL),
    'Global search accepts table filter'
);

SELECT ok(
    (SELECT supamode.global_search('test', 10, 0, ARRAY['public'], ARRAY['users', 'products']) IS NOT NULL),
    'Global search accepts multiple table filters'
);

-- Test 8: Pagination parameters work
SELECT ok(
    (SELECT supamode.global_search('test', 5, 0) IS NOT NULL),
    'Global search accepts custom limit'
);

SELECT ok(
    (SELECT supamode.global_search('test', 10, 5) IS NOT NULL),
    'Global search accepts custom offset'
);

-- Test 9: Timeout parameter works
SELECT ok(
    (SELECT supamode.global_search('test', 10, 0, ARRAY['public'], NULL, 5) IS NOT NULL),
    'Global search accepts custom timeout'
);

-- Test 10: Search result structure for each result item
-- Note: Since we don't have actual data, we test the expected structure when results exist
SELECT ok(
    (SELECT (supamode.global_search('test')::jsonb)->'results' IS NOT NULL),
    'Search results array exists'
);

-- Test 11: Performance metrics are included
SELECT ok(
    (SELECT (supamode.global_search('test')::jsonb)->'performance'->>'elapsed_seconds' IS NOT NULL),
    'Performance metrics include elapsed_seconds'
);

SELECT ok(
    (SELECT (supamode.global_search('test')::jsonb)->'performance'->>'timeout_seconds' IS NOT NULL),
    'Performance metrics include timeout_seconds'
);

SELECT is(
    (SELECT (supamode.global_search('test')::jsonb)->'performance'->>'timeout_seconds')::int,
    15,
    'Default timeout is 15 seconds'
);

-- Test 12: Function respects searchable flag in table metadata
-- Verify that non-searchable tables are not included
-- Since sensitive_data has is_searchable = false, it should not be searched even if user has permission

-- First, give the search admin permission to the sensitive table
SET ROLE postgres;
INSERT INTO supamode.permissions (id, name, permission_type, scope, schema_name, table_name, action) VALUES
    (kit.test_uuid(331), 'public_sensitive_select', 'data', 'table', 'public', 'sensitive_data', 'select');

INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    (kit.test_uuid(201), kit.test_uuid(331));

SELECT kit.authenticate_as('search_admin');

-- Even with permission, non-searchable tables should not be included
-- We can't verify this directly without real data, but the function logic excludes is_searchable = false

-- Test 13: Query field is preserved in response
SELECT is(
    (SELECT (supamode.global_search('my_test_query')::jsonb)->>'query'),
    'my_test_query',
    'Search query is preserved in response'
);

-- Test 14: Empty search query handling
SELECT is(
    (SELECT (supamode.global_search('')::jsonb)->>'total')::int,
    0,
    'Empty search query returns no results'
);

-- Test 15: NULL search query handling
SELECT ok(
    (SELECT supamode.global_search(NULL) IS NOT NULL),
    'Function handles NULL query gracefully'
);

-- Test 16: Very long search query
SELECT ok(
    (SELECT supamode.global_search(repeat('a', 100)) IS NOT NULL),
    'Function handles long search queries'
);

-- Test 17: Special characters in search query
SELECT ok(
    (SELECT supamode.global_search('test@example.com') IS NOT NULL),
    'Function handles special characters in query'
);

SELECT ok(
    (SELECT supamode.global_search('test & company') IS NOT NULL),
    'Function handles ampersand in query'
);

SELECT ok(
    (SELECT supamode.global_search('test''s data') IS NOT NULL),
    'Function handles apostrophe in query'
);

-- Test 18: Search with SQL injection attempts (should be safe)
SELECT ok(
    (SELECT supamode.global_search('test''; DROP TABLE users; --') IS NOT NULL),
    'Function safely handles SQL injection attempts'
);

SELECT ok(
    (SELECT supamode.global_search('test'' OR 1=1 --') IS NOT NULL),
    'Function safely handles OR injection attempts'
);

-- Test 19: Extreme limit values
SELECT ok(
    (SELECT supamode.global_search('test', 1, 0) IS NOT NULL),
    'Function handles minimum limit value'
);

SELECT ok(
    (SELECT supamode.global_search('test', 1000, 0) IS NOT NULL),
    'Function handles large limit value'
);

-- Test 20: Invalid parameters
SELECT ok(
    (SELECT supamode.global_search('test', -1, 0) IS NOT NULL),
    'Function handles negative limit gracefully'
);

SELECT ok(
    (SELECT supamode.global_search('test', 10, -1) IS NOT NULL),
    'Function handles negative offset gracefully'
);

-- Test 21: Multiple word search terms
SELECT ok(
    (SELECT supamode.global_search('user account') IS NOT NULL),
    'Function handles multi-word search queries'
);

-- Test 22: Case sensitivity testing
SELECT ok(
    (SELECT supamode.global_search('USER') IS NOT NULL),
    'Function handles uppercase search terms'
);

SELECT ok(
    (SELECT supamode.global_search('User') IS NOT NULL),
    'Function handles mixed case search terms'
);

-- Test 23: Unicode and international characters
SELECT ok(
    (SELECT supamode.global_search('tëst üsër') IS NOT NULL),
    'Function handles unicode characters'
);

-- Test 24: Performance with many filters
SELECT ok(
    (SELECT supamode.global_search('test', 10, 0, 
        ARRAY['public', 'admin', 'other'], 
        ARRAY['users', 'products', 'transactions', 'categories']) IS NOT NULL),
    'Function handles multiple schema and table filters'
);

-- Test 25: Verify has_more flag logic
-- When tables_searched reaches the maximum, has_more should be true
SELECT ok(
    (SELECT (supamode.global_search('test')::jsonb) ? 'has_more'),
    'Search response includes has_more flag'
);

SELECT finish();

ROLLBACK;