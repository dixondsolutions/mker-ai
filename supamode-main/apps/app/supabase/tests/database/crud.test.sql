-- Test file: crud_functions.test.sql
-- Tests supamode CRUD functions and their tight integration with the permission system
-- This tests insert_record, update_record, delete_record, and query_table functions

BEGIN;
CREATE EXTENSION "basejump-supabase_test_helpers" VERSION '0.0.6';

SELECT no_plan();

-- Clean up any existing test data
DROP TABLE IF EXISTS public.test_products CASCADE;
DROP TABLE IF EXISTS public.test_orders CASCADE;
DROP TABLE IF EXISTS public.test_customers CASCADE;

DELETE FROM supamode.audit_logs;
DELETE FROM supamode.permission_groups;
DELETE FROM supamode.table_metadata;
DELETE FROM supamode.permission_group_permissions;
DELETE FROM supamode.role_permission_groups;
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

-- Create test tables in public schema
CREATE TABLE public.test_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER CHECK (age >= 0),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.test_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) CHECK (price >= 0),
    category VARCHAR(50),
    in_stock BOOLEAN DEFAULT true,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.test_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.test_customers(id),
    product_id UUID REFERENCES public.test_products(id),
    quantity INTEGER CHECK (quantity > 0),
    order_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending',
    total_amount NUMERIC(10,2)
);

-- Create test users
SELECT kit.create_supabase_user(kit.test_uuid(1), 'crud_admin', 'crudadmin@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(2), 'customers_manager', 'custmgr@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(3), 'products_user', 'produser@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(4), 'read_only_user', 'readonly@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(5), 'no_data_access', 'nodata@test.com');
SELECT kit.create_supabase_user(kit.test_uuid(6), 'partial_access', 'partial@test.com');

-- Create accounts
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
    (kit.test_uuid(101), kit.test_uuid(1), true),  -- CRUD Admin account
    (kit.test_uuid(102), kit.test_uuid(2), true),  -- Customers Manager account  
    (kit.test_uuid(103), kit.test_uuid(3), true),  -- Products User account
    (kit.test_uuid(104), kit.test_uuid(4), true),  -- Read Only User account
    (kit.test_uuid(105), kit.test_uuid(5), true),  -- No Data Access account
    (kit.test_uuid(106), kit.test_uuid(6), true);  -- Partial Access account

-- Create roles
INSERT INTO supamode.roles (id, name, rank, description) VALUES
    (kit.test_uuid(201), 'CRUD Admin', 90, 'Full CRUD access to all tables'),
    (kit.test_uuid(202), 'Customers Manager', 60, 'Full access to customers table only'),
    (kit.test_uuid(203), 'Products User', 50, 'Read/write access to products'),
    (kit.test_uuid(204), 'Read Only User', 30, 'Read-only access to all tables'),
    (kit.test_uuid(205), 'No Data Access', 20, 'No data table access'),
    (kit.test_uuid(206), 'Partial Access', 25, 'Mixed permissions for testing');

-- Create comprehensive data permissions for testing
INSERT INTO supamode.permissions (id, name, permission_type, scope, schema_name, table_name, action) VALUES
    -- Full permissions for test_customers
    (kit.test_uuid(301), 'customers_select', 'data', 'table', 'public', 'test_customers', 'select'),
    (kit.test_uuid(302), 'customers_insert', 'data', 'table', 'public', 'test_customers', 'insert'),
    (kit.test_uuid(303), 'customers_update', 'data', 'table', 'public', 'test_customers', 'update'),
    (kit.test_uuid(304), 'customers_delete', 'data', 'table', 'public', 'test_customers', 'delete'),
    (kit.test_uuid(305), 'customers_all', 'data', 'table', 'public', 'test_customers', '*'),
    
    -- Full permissions for test_products
    (kit.test_uuid(311), 'products_select', 'data', 'table', 'public', 'test_products', 'select'),
    (kit.test_uuid(312), 'products_insert', 'data', 'table', 'public', 'test_products', 'insert'),
    (kit.test_uuid(313), 'products_update', 'data', 'table', 'public', 'test_products', 'update'),
    (kit.test_uuid(314), 'products_delete', 'data', 'table', 'public', 'test_products', 'delete'),
    
    -- Full permissions for test_orders  
    (kit.test_uuid(321), 'orders_select', 'data', 'table', 'public', 'test_orders', 'select'),
    (kit.test_uuid(322), 'orders_insert', 'data', 'table', 'public', 'test_orders', 'insert'),
    (kit.test_uuid(323), 'orders_update', 'data', 'table', 'public', 'test_orders', 'update'),
    (kit.test_uuid(324), 'orders_delete', 'data', 'table', 'public', 'test_orders', 'delete'),
    
    -- Wildcard permissions for testing
    (kit.test_uuid(331), 'public_all_select', 'data', 'table', 'public', '*', 'select'),
    (kit.test_uuid(332), 'all_customers_select', 'data', 'table', '*', 'test_customers', 'select');

insert into supamode.permissions (id, name, permission_type, system_resource, action) values
    (kit.test_uuid(333), 'log_select', 'system', 'log', 'select');

-- Assign roles to accounts
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(101), kit.test_uuid(201)),  -- CRUD Admin
    (kit.test_uuid(102), kit.test_uuid(202)),  -- Customers Manager
    (kit.test_uuid(103), kit.test_uuid(203)),  -- Products User
    (kit.test_uuid(104), kit.test_uuid(204)),  -- Read Only User
    (kit.test_uuid(105), kit.test_uuid(205)),  -- No Data Access
    (kit.test_uuid(106), kit.test_uuid(206));  -- Partial Access

-- Grant permissions to roles - carefully designed to test different scenarios
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    -- CRUD Admin gets wildcard permission for customers (tests * action)
    (kit.test_uuid(201), kit.test_uuid(305)),  -- customers *
    (kit.test_uuid(201), kit.test_uuid(311)),  -- products select
    (kit.test_uuid(201), kit.test_uuid(312)),  -- products insert
    (kit.test_uuid(201), kit.test_uuid(313)),  -- products update
    (kit.test_uuid(201), kit.test_uuid(314)),  -- products delete
    (kit.test_uuid(201), kit.test_uuid(321)),  -- orders select
    (kit.test_uuid(201), kit.test_uuid(322)),  -- orders insert
    (kit.test_uuid(201), kit.test_uuid(323)),  -- orders update
    (kit.test_uuid(201), kit.test_uuid(324)),  -- orders delete
    (kit.test_uuid(201), kit.test_uuid(333)),  -- log select
    
    -- Customers Manager gets full access to customers only
    (kit.test_uuid(202), kit.test_uuid(301)),  -- customers select
    (kit.test_uuid(202), kit.test_uuid(302)),  -- customers insert
    (kit.test_uuid(202), kit.test_uuid(303)),  -- customers update
    (kit.test_uuid(202), kit.test_uuid(304)),  -- customers delete
    
    -- Products User gets read/write for products (no delete)
    (kit.test_uuid(203), kit.test_uuid(311)),  -- products select
    (kit.test_uuid(203), kit.test_uuid(312)),  -- products insert
    (kit.test_uuid(203), kit.test_uuid(313)),  -- products update
    
    -- Read Only User gets wildcard select permission (tests * table wildcard)
    (kit.test_uuid(204), kit.test_uuid(331)),  -- public.* select
    
    -- No Data Access gets no permissions (baseline test)
    
    -- Partial Access gets mixed permissions for edge case testing
    (kit.test_uuid(206), kit.test_uuid(301)),  -- customers select
    (kit.test_uuid(206), kit.test_uuid(302)),  -- customers insert
    (kit.test_uuid(206), kit.test_uuid(311));  -- products select

-- Sync table metadata for our test tables
SELECT supamode.sync_managed_tables('public', 'test_customers');
SELECT supamode.sync_managed_tables('public', 'test_products');
SELECT supamode.sync_managed_tables('public', 'test_orders');

-- Verify tables were added to metadata
SELECT isnt_empty(
    $$ SELECT * FROM supamode.table_metadata WHERE schema_name = 'public' AND table_name = 'test_customers' $$,
    'test_customers table was added to metadata'
);

SELECT isnt_empty(
    $$ SELECT * FROM supamode.table_metadata WHERE schema_name = 'public' AND table_name = 'test_products' $$,
    'test_products table was added to metadata'
);

SELECT isnt_empty(
    $$ SELECT * FROM supamode.table_metadata WHERE schema_name = 'public' AND table_name = 'test_orders' $$,
    'test_orders table was added to metadata'
);

-- Test 1: Admin access requirement for all CRUD functions
SELECT kit.authenticate_as('no_data_access');
SELECT kit.set_admin_access('nodata@test.com', 'false');

SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "Test", "email": "test@test.com"}'::jsonb))->>'success')::boolean,
    false,
    'User without admin access cannot use insert_record'
);

SELECT is(
    (SELECT (supamode.update_record('public', 'test_customers', 'fake-id', '{"name": "Updated"}'::jsonb))->>'success')::boolean,
    false,
    'User without admin access cannot use update_record'
);

SELECT is(
    (SELECT (supamode.delete_record('public', 'test_customers', 'fake-id'))->>'success')::boolean,
    false,
    'User without admin access cannot use delete_record'
);

SELECT throws_ilike(
    $$ SELECT supamode.query_table('public', 'test_customers') $$,
    'Query execution failed for public.test_customers: %',
    'User without admin access cannot use query_table'
);

-- Restore admin access
SELECT kit.set_admin_access('nodata@test.com', 'true');

-- Test 2: Data permission requirements - user with no data permissions
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "Test", "email": "test@test.com"}'::jsonb))->>'success')::boolean,
    false,
    'User without data permissions cannot insert records'
);


SELECT throws_ilike(
   $$ SELECT supamode.query_table('public', 'test_customers') $$,
   'Query execution failed for public.test_customers: %',
   'User without data permissions cannot query tables'
);

-- Test 3: CRUD Admin with wildcard permissions can do everything on customers
SELECT kit.authenticate_as('crud_admin');

-- Insert using wildcard permission
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "John Doe", "email": "john@test.com", "age": 30, "is_active": true}'::jsonb))->>'success')::boolean,
    true,
    'CRUD Admin can insert customers (wildcard permission)'
);

-- Verify the record exists
SELECT is(
    (SELECT (supamode.query_table('public', 'test_customers')).total_count),
    1::bigint,
    'Inserted customer record is queryable'
);

-- Update using wildcard permission
SELECT is(
    (SELECT (supamode.update_record_by_conditions('public', 'test_customers', 
        '{"email": "john@test.com"}'::jsonb,
        '{"name": "John Smith", "age": 31}'::jsonb))->>'success')::boolean,
    true,
    'CRUD Admin can update customers (wildcard permission)'
);

-- Delete using wildcard permission
SELECT is(
    (SELECT (supamode.delete_record_by_conditions('public', 'test_customers',
        '{"email": "john@test.com"}'::jsonb))->>'success')::boolean,
    true,
    'CRUD Admin can delete customers (wildcard permission)'
);

-- Test 4: CRUD Admin with specific permissions on products
-- Insert with specific permission
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_products', '{"name": "Widget", "price": 29.99, "category": "gadgets"}'::jsonb))->>'success')::boolean,
    true,
    'CRUD Admin can insert products (specific permission)'
);

-- Update with specific permission
SELECT is(
    (SELECT (supamode.update_record_by_conditions('public', 'test_products',
        '{"name": "Widget"}'::jsonb,
        '{"price": 39.99}'::jsonb))->>'success')::boolean,
    true,
    'CRUD Admin can update products (specific permission)'
);

-- Delete with specific permission
SELECT is(
    (SELECT (supamode.delete_record_by_conditions('public', 'test_products',
        '{"name": "Widget"}'::jsonb))->>'success')::boolean,
    true,
    'CRUD Admin can delete products (specific permission)'
);

-- Test 5: Customers Manager - full access to customers, no access to products
SELECT kit.authenticate_as('customers_manager');

-- Can manage customers
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "Customer Manager Test", "email": "cm@test.com"}'::jsonb))->>'success')::boolean,
    true,
    'Customers Manager can insert customers'
);

SELECT is(
    (SELECT (supamode.update_record_by_conditions('public', 'test_customers',
        '{"email": "cm@test.com"}'::jsonb,
        '{"name": "CM Updated"}'::jsonb))->>'success')::boolean,
    true,
    'Customers Manager can update customers'
);

SELECT is(
    (SELECT (supamode.query_table('public', 'test_customers')).total_count >= 1),
    true,
    'Customers Manager can query customers'
);

-- Cannot access products
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_products', '{"name": "Unauthorized", "price": 10.00}'::jsonb))->>'success')::boolean,
    false,
    'Customers Manager cannot insert products (no permission)'
);

SELECT throws_ilike(
    $$ (SELECT (supamode.query_table('public', 'test_products')).records) $$,
    'Query execution failed for public.test_products: The user does not have permission to read this table (SQLSTATE: 42501)',
    'Customers Manager cannot query products (no permission)'
);

-- Cannot access orders
SELECT throws_ilike(
    $$ (SELECT (supamode.query_table('public', 'test_orders')).records) $$,
    'Query execution failed for public.test_orders: The user does not have permission to read this table (SQLSTATE: 42501)',
    'Customers Manager cannot query orders (no permission)'
);

-- Test 6: Products User - read/write products (no delete)
SELECT kit.authenticate_as('products_user');

-- Can insert and update products
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_products', '{"name": "Product User Widget", "price": 19.99}'::jsonb))->>'success')::boolean,
    true,
    'Products User can insert products'
);

SELECT is(
    (SELECT (supamode.update_record_by_conditions('public', 'test_products',
        '{"name": "Product User Widget"}'::jsonb,
        '{"price": 24.99}'::jsonb))->>'success')::boolean,
    true,
    'Products User can update products'
);

SELECT is(
    (SELECT (supamode.query_table('public', 'test_products')).total_count >= 1),
    true,
    'Products User can query products'
);

-- Cannot delete products
SELECT is(
    (SELECT (supamode.delete_record_by_conditions('public', 'test_products',
        '{"name": "Product User Widget"}'::jsonb))->>'success')::boolean,
    false,
    'Products User cannot delete products (no permission)'
);

-- Cannot access customers
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "Unauthorized", "email": "unauth@test.com"}'::jsonb))->>'success')::boolean,
    false,
    'Products User cannot insert customers (no permission)'
);

SELECT throws_ilike(
   $$ (SELECT (supamode.query_table('public', 'test_customers')).records) $$,
    'Query execution failed for public.test_customers: The user does not have permission to read this table (SQLSTATE: 42501)',
    'Products User cannot query customers (no permission)'
);

-- Test 7: Read Only User with wildcard select permission
SELECT kit.authenticate_as('read_only_user');

-- Can query all tables (wildcard select on public.*)
SELECT is(
    (SELECT (supamode.query_table('public', 'test_customers')).total_count >= 0),
    true,
    'Read Only User can query customers (wildcard select)'
);

SELECT is(
    (SELECT (supamode.query_table('public', 'test_products')).total_count >= 0),
    true,
    'Read Only User can query products (wildcard select)'
);

SELECT is(
    (SELECT (supamode.query_table('public', 'test_orders')).total_count >= 0),
    true,
    'Read Only User can query orders (wildcard select)'
);

-- Cannot insert anywhere
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "RO Test", "email": "ro@test.com"}'::jsonb))->>'success')::boolean,
    false,
    'Read Only User cannot insert customers (no permission)'
);

SELECT is(
    (SELECT (supamode.insert_record('public', 'test_products', '{"name": "RO Product", "price": 10.00}'::jsonb))->>'success')::boolean,
    false,
    'Read Only User cannot insert products (no permission)'
);

-- Cannot update anywhere
SELECT is(
    (SELECT (supamode.update_record_by_conditions('public', 'test_customers',
        '{"email": "cm@test.com"}'::jsonb,
        '{"name": "RO Hack"}'::jsonb))->>'success')::boolean,
    false,
    'Read Only User cannot update customers (no permission)'
);

-- Cannot delete anywhere
SELECT is(
    (SELECT (supamode.delete_record_by_conditions('public', 'test_products',
        '{"name": "Product User Widget"}'::jsonb))->>'success')::boolean,
    false,
    'Read Only User cannot delete products (no permission)'
);

-- Test 8: Partial Access User - mixed permissions
SELECT kit.authenticate_as('partial_access');

-- Can read customers and products
SELECT is(
    (SELECT (supamode.query_table('public', 'test_customers')).total_count >= 0),
    true,
    'Partial Access can query customers'
);

SELECT is(
    (SELECT (supamode.query_table('public', 'test_products')).total_count >= 0),
    true,
    'Partial Access can query products'
);

-- Can insert customers but not update/delete
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "Partial User", "email": "partial@test.com"}'::jsonb))->>'success')::boolean,
    true,
    'Partial Access can insert customers'
);

SELECT is(
    (SELECT (supamode.update_record_by_conditions('public', 'test_customers',
        '{"email": "partial@test.com"}'::jsonb,
        '{"name": "Partial Updated"}'::jsonb))->>'success')::boolean,
    false,
    'Partial Access cannot update customers (no permission)'
);

SELECT is(
    (SELECT (supamode.delete_record_by_conditions('public', 'test_customers',
        '{"email": "partial@test.com"}'::jsonb))->>'success')::boolean,
    false,
    'Partial Access cannot delete customers (no permission)'
);

-- Cannot insert products (only has select)
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_products', '{"name": "Partial Product", "price": 5.00}'::jsonb))->>'success')::boolean,
    false,
    'Partial Access cannot insert products (no permission)'
);

-- Cannot access orders at all
SELECT throws_ok(
    $$ (SELECT (supamode.query_table('public', 'test_orders')).records) $$,
    'Query execution failed for public.test_orders: The user does not have permission to read this table (SQLSTATE: 42501)',
    'Partial Access cannot query orders (no permission)'
);

-- Test 9: Cross-table foreign key operations (permissions on both tables required)
SELECT kit.authenticate_as('crud_admin');

-- First create required data
SELECT supamode.insert_record('public', 'test_customers', '{"name": "FK Customer", "email": "fk@test.com"}'::jsonb);
SELECT supamode.insert_record('public', 'test_products', '{"name": "FK Product", "price": 15.99}'::jsonb);

-- Create order with foreign keys (requires permissions on both referenced tables)
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_orders', format('{"customer_id": "%s", "product_id": "%s", "quantity": 2, "total_amount": 31.98}',
        (SELECT (records::jsonb -> 0 ->> 'id') FROM supamode.query_table('public', 'test_customers') WHERE records::jsonb @> '[{"email": "fk@test.com"}]'),
        (SELECT (records::jsonb -> 0 ->> 'id') FROM supamode.query_table('public', 'test_products') WHERE records::jsonb @> '[{"name": "FK Product"}]')
    )::jsonb))->>'success')::boolean,
    true,
    'CRUD Admin can create orders with foreign keys'
);

-- Test 10: Permission boundary testing - table exists but no permission
-- Try to access a table that exists but user has no permission for
set role postgres;

-- Create a new table that's not in the permission system yet
CREATE TABLE public.test_secret (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_data TEXT
);

SELECT supamode.sync_managed_tables('public', 'test_secret');

SELECT kit.authenticate_as('customers_manager');

-- Should fail because no permission exists
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_secret', '{"secret_data": "hack attempt"}'::jsonb))->>'success')::boolean,
    false,
    'User cannot access table without explicit permission'
);

SELECT throws_ok(
    $$ (SELECT (supamode.query_table('public', 'test_secret')).records) $$,
    'Query execution failed for public.test_secret: The user does not have permission to read this table (SQLSTATE: 42501)',
    'User cannot query table without explicit permission'
);

-- Test 11: Invalid schema/table error handling
SELECT kit.authenticate_as('crud_admin');

-- Test invalid schema
SELECT is(
    (SELECT (supamode.insert_record('nonexistent_schema', 'test_customers', '{"name": "Test"}'::jsonb))->>'success')::boolean,
    false,
    'Insert fails with invalid schema name'
);

-- Test invalid table
SELECT is(
    (SELECT (supamode.insert_record('public', 'nonexistent_table', '{"name": "Test"}'::jsonb))->>'success')::boolean,
    false,
    'Insert fails with invalid table name'
);

-- Test 12: Column-level editability from table metadata
-- The sync_managed_tables should have set some columns as non-editable
-- Test that we can't edit read-only columns like created_at, updated_at
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "TimeHack", "email": "timehack@test.com", "created_at": "2020-01-01T00:00:00Z"}'::jsonb))->>'success')::boolean,
    true,
    'Insert succeeds but ignores non-editable columns'
);

-- The created_at should be auto-generated, not the value we tried to set
SELECT isnt(
    (SELECT (records::jsonb -> 0 ->> 'created_at') FROM supamode.query_table('public', 'test_customers') WHERE records::jsonb @> '[{"email": "timehack@test.com"}]'),
    '2020-01-01T00:00:00+00',
    'Non-editable columns are ignored during insert'
);

-- Test 13: Complex query operations with permission verification
-- Test advanced filtering, sorting, pagination (all require select permission)
SELECT is(
    (SELECT jsonb_array_length((supamode.query_table('public', 'test_customers',
        '[{"column": "is_active", "operator": "=", "value": true}]'::jsonb)).records) >= 0),
    true,
    'CRUD Admin can use filtered queries'
);


SELECT is(
    (SELECT jsonb_array_length((supamode.query_table('public', 'test_customers', '[]'::jsonb, '{}'::jsonb, '{"limit": 2, "offset": 0}'::jsonb)).records)),
    2,
    'CRUD Admin can use paginated queries'
);

-- Test that user without permission cannot use advanced queries
SELECT kit.authenticate_as('products_user');

SELECT throws_ok(
    $$ (SELECT (supamode.query_table('public', 'test_customers', '[{"column": "is_active", "operator": "=", "value": true}]'::jsonb)).records) $$,
    'Query execution failed for public.test_customers: The user does not have permission to read this table (SQLSTATE: 42501)',
    'User without permission cannot use filtered queries on restricted table'
);

-- Test 14: Direct account permissions override role permissions
SET ROLE postgres;

-- Give direct permission to no_data_access user
INSERT INTO supamode.account_permissions (account_id, permission_id, is_grant) VALUES
    (kit.test_uuid(105), kit.test_uuid(311), true);  -- products select

SELECT kit.authenticate_as('no_data_access');

-- Should now be able to query products (direct permission)
SELECT is(
    (SELECT (supamode.query_table('public', 'test_products')).total_count >= 0),
    true,
    'User with direct account permission can access table'
);

-- But still cannot access customers (no permission)
SELECT throws_ok(
    $$ (SELECT (supamode.query_table('public', 'test_customers')).records) $$,
    'Query execution failed for public.test_customers: The user does not have permission to read this table (SQLSTATE: 42501)',
    'User still cannot access tables without permission'
);

-- Test 15: Explicit denial overrides grants
SET ROLE postgres;

-- Add explicit denial for products (should override the grant we just added)
UPDATE supamode.account_permissions SET is_grant = false
WHERE account_id = kit.test_uuid(105) AND permission_id = kit.test_uuid(311);

SELECT kit.authenticate_as('no_data_access');

-- Should now be denied access even though we have a grant
SELECT throws_ok(
    $$ (SELECT (supamode.query_table('public', 'test_products')).records) $$,
    'Query execution failed for public.test_products: The user does not have permission to read this table (SQLSTATE: 42501)',
    'Explicit denial overrides permission grants'
);

-- Test 16: Audit logging verification for CRUD operations
SELECT kit.authenticate_as('crud_admin');

-- Perform operations that should create audit logs
SELECT supamode.insert_record('public', 'test_customers', '{"name": "Audit Test", "email": "audit@test.com"}'::jsonb);

-- Check that audit logs were created
SELECT isnt_empty(
    $$ SELECT * FROM supamode.audit_logs WHERE operation = 'INSERT' AND schema_name = 'public' AND table_name = 'test_customers' AND account_id = kit.test_uuid(101) $$,
    'Audit logs are created for INSERT operations with correct account'
);

-- Update and check audit log
SELECT supamode.update_record_by_conditions('public', 'test_customers', '{"email": "audit@test.com"}'::jsonb, '{"name": "Audit Updated"}'::jsonb);

SELECT isnt_empty(
    $$ SELECT * FROM supamode.audit_logs WHERE operation = 'UPDATE' AND schema_name = 'public' AND table_name = 'test_customers' AND account_id = kit.test_uuid(101) $$,
    'Audit logs are created for UPDATE operations with correct account'
);

-- Delete and check audit log
SELECT supamode.delete_record_by_conditions('public', 'test_customers', '{"email": "audit@test.com"}'::jsonb);

-- verify record was deleted
SELECT is_empty(
    $$ SELECT * FROM public.test_customers WHERE email = 'audit@test.com' $$,
    'Record was deleted'
);

SELECT isnt_empty(
    $$ SELECT * FROM supamode.audit_logs WHERE operation = 'DELETE' AND schema_name = 'public' AND table_name = 'test_customers' AND account_id = kit.test_uuid(101) $$,
    'Audit logs are created for DELETE operations with correct account'
);

-- Test 17: Schema Protection - Protected Supabase schemas should reject write operations
SELECT kit.authenticate_as('crud_admin');

-- Test insert protection on auth schema
SELECT is(
    (SELECT (supamode.insert_record('auth', 'users', '{"email": "hack@test.com"}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into protected auth schema'
);

-- Verify error message contains expected text
SELECT ok(
    (SELECT (supamode.insert_record('auth', 'users', '{"email": "hack@test.com"}'::jsonb))->>'error' ILIKE '%Write operations are not allowed on protected schema: auth%'),
    'Auth schema insert shows proper error message'
);

-- Test update protection on storage schema
SELECT is(
    (SELECT (supamode.update_record_by_conditions('storage', 'objects', 
        '{"name": "test"}'::jsonb, '{"metadata": "{}"}'::jsonb))->>'success')::boolean,
    false,
    'Cannot update in protected storage schema'
);

-- Test delete protection on extensions schema
SELECT is(
    (SELECT (supamode.delete_record_by_conditions('extensions', 'pg_stat_statements',
        '{"query": "SELECT 1"}'::jsonb))->>'success')::boolean,
    false,
    'Cannot delete from protected extensions schema'
);

-- Test all 17 protected schemas with insert operations
SELECT is(
    (SELECT (supamode.insert_record('cron', 'job', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into cron schema'
);

SELECT is(
    (SELECT (supamode.insert_record('information_schema', 'tables', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into information_schema'
);

SELECT is(
    (SELECT (supamode.insert_record('net', 'http_request_queue', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into net schema'
);

SELECT is(
    (SELECT (supamode.insert_record('pgsodium', 'key', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into pgsodium schema'
);

SELECT is(
    (SELECT (supamode.insert_record('pgsodium_masks', 'mask', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into pgsodium_masks schema'
);

SELECT is(
    (SELECT (supamode.insert_record('pgbouncer', 'stats', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into pgbouncer schema'
);

SELECT is(
    (SELECT (supamode.insert_record('pgtle', 'extension', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into pgtle schema'
);

SELECT is(
    (SELECT (supamode.insert_record('realtime', 'subscription', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into realtime schema'
);

SELECT is(
    (SELECT (supamode.insert_record('supabase_functions', 'hooks', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into supabase_functions schema'
);

SELECT is(
    (SELECT (supamode.insert_record('supabase_migrations', 'schema_migrations', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into supabase_migrations schema'
);

SELECT is(
    (SELECT (supamode.insert_record('vault', 'secrets', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into vault schema'
);

SELECT is(
    (SELECT (supamode.insert_record('graphql', 'subscription', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into graphql schema'
);

SELECT is(
    (SELECT (supamode.insert_record('graphql_public', 'subscription', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into graphql_public schema'
);

SELECT is(
    (SELECT (supamode.insert_record('pgmq_public', 'queue', '{}'::jsonb))->>'success')::boolean,
    false,
    'Cannot insert into pgmq_public schema'
);

-- Test 18: Schema Protection - User-defined schemas should still work
-- Test that public schema (user-defined) still works normally
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "Schema Test", "email": "schematest@test.com"}'::jsonb))->>'success')::boolean,
    true,
    'Public schema still accepts insert operations'
);

SELECT is(
    (SELECT (supamode.update_record_by_conditions('public', 'test_customers',
        '{"email": "schematest@test.com"}'::jsonb,
        '{"name": "Schema Updated"}'::jsonb))->>'success')::boolean,
    true,
    'Public schema still accepts update operations'
);

SELECT is(
    (SELECT (supamode.delete_record_by_conditions('public', 'test_customers',
        '{"email": "schematest@test.com"}'::jsonb))->>'success')::boolean,
    true,
    'Public schema still accepts delete operations'
);

-- Test 19: Schema Protection - supamode schema should be writable for its own operations
-- The supamode schema should not be protected since it needs to write to its own tables
-- This is implicit in the existing tests but let's verify it explicitly

-- Insert a test account (this uses supamode schema internally)
SET ROLE postgres;
SELECT kit.create_supabase_user(kit.test_uuid(7), 'schema_test_user', 'schematest@example.com');

INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
    (kit.test_uuid(107), kit.test_uuid(7), true);

-- Verify the account was created (supamode schema write worked)
SELECT isnt_empty(
    $$ SELECT * FROM supamode.accounts WHERE id = kit.test_uuid(107) $$,
    'Supamode schema allows internal write operations'
);

-- Test 20: Schema Protection validation function directly
-- Test the validate_schema_access function directly
SELECT is(
    supamode.validate_schema_access('public'),
    true,
    'validate_schema_access returns true for public schema'
);

SELECT is(
    supamode.validate_schema_access('auth'),
    false,
    'validate_schema_access returns false for auth schema'
);

SELECT is(
    supamode.validate_schema_access('storage'),
    false,
    'validate_schema_access returns false for storage schema'
);

SELECT is(
    supamode.validate_schema_access('supamode'),
    false,
    'validate_schema_access returns false for supamode schema'
);

-- Test custom schema (should be allowed)
SELECT is(
    supamode.validate_schema_access('my_custom_schema'),
    true,
    'validate_schema_access returns true for custom schemas'
);

-- Test 21: Schema Protection - Error codes and messages
-- Verify that protected schema operations return the correct error codes
SELECT kit.authenticate_as('crud_admin');

SELECT is(
    (SELECT (supamode.insert_record('auth', 'users', '{"email": "test@test.com"}'::jsonb)->'meta'->>'sqlstate')),
    '42501',
    'Protected schema operations return insufficient_privilege error code'
);

-- Test that the error message explains the protection
SELECT ok(
    (SELECT (supamode.update_record_by_conditions('storage', 'objects', '{"name": "test"}'::jsonb, '{"metadata": "{}"}'::jsonb))->>'error' ILIKE '%This schema is managed by Supabase and is critical to the functionality of your project%'),
    'Protected schema error includes helpful explanation'
);

-- Test 22: Inactive user cannot perform CRUD operations
-- Inactive users are blocked by the permission system because get_current_user_account_id() 
-- only returns account IDs for active users (WHERE is_active = true).
-- This means inactive users appear to have "no permission" rather than getting explicit
-- "account is not active" errors.
-- Create an inactive user account
SET ROLE postgres;

SELECT kit.create_supabase_user(kit.test_uuid(8), 'inactive_user', 'inactive@test.com');

-- Create inactive account
INSERT INTO supamode.accounts (id, auth_user_id, is_active) VALUES
    (kit.test_uuid(108), kit.test_uuid(8), true);  -- Inactive account

-- Create a role for the inactive user with full permissions
INSERT INTO supamode.roles (id, name, rank, description) VALUES
    (kit.test_uuid(208), 'Inactive User Role', 70, 'Role for testing inactive user restrictions');

-- Grant the role full permissions (this tests that permissions are irrelevant if account is inactive)
INSERT INTO supamode.role_permissions (role_id, permission_id) VALUES
    (kit.test_uuid(208), kit.test_uuid(305)),  -- customers wildcard
    (kit.test_uuid(208), kit.test_uuid(311)),  -- products select
    (kit.test_uuid(208), kit.test_uuid(312)),  -- products insert
    (kit.test_uuid(208), kit.test_uuid(313)),  -- products update
    (kit.test_uuid(208), kit.test_uuid(314));  -- products delete

-- Assign role to inactive account
INSERT INTO supamode.account_roles (account_id, role_id) VALUES
    (kit.test_uuid(108), kit.test_uuid(208));

-- deactivate the account (requires postgres role due to column-level permissions)
SET ROLE postgres;
UPDATE supamode.accounts SET is_active = false WHERE id = kit.test_uuid(108);
RESET ROLE;

-- Set admin access for the inactive user (this ensures admin access alone isn't sufficient)
SELECT kit.set_admin_access('inactive@test.com', 'true');

-- Authenticate as the inactive user
SELECT kit.authenticate_as('inactive_user');

-- Test that inactive user cannot insert records despite having permissions
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "Inactive Test", "email": "inactive_test@test.com"}'::jsonb))->>'success')::boolean,
    false,
    'Inactive user cannot insert records even with proper permissions'
);

-- Test that inactive user cannot update records
SELECT is(
    (SELECT (supamode.update_record_by_conditions('public', 'test_customers',
        '{"name": "FK Customer"}'::jsonb,
        '{"name": "Inactive Hack"}'::jsonb))->>'success')::boolean,
    false,
    'Inactive user cannot update records even with proper permissions'
);

-- Test that inactive user cannot delete records
SELECT is(
    (SELECT (supamode.delete_record_by_conditions('public', 'test_customers',
        '{"name": "FK Customer"}'::jsonb))->>'success')::boolean,
    false,
    'Inactive user cannot delete records even with proper permissions'
);

-- Test that inactive user cannot query tables
SELECT throws_ilike(
    $$ SELECT supamode.query_table('public', 'test_customers') $$,
    'Query execution failed for public.test_customers: The user does not have permission to read this table%',
    'Inactive user cannot query tables even with proper permissions'
);

-- Test that inactive user cannot query products either
SELECT throws_ilike(
    $$ SELECT supamode.query_table('public', 'test_products') $$,
    'Query execution failed for public.test_products: The user does not have permission to read this table%',
    'Inactive user cannot query any tables regardless of permissions'
);

-- Now activate the account and verify operations work
select kit.authenticate_as('crud_admin');
SET ROLE postgres;
UPDATE supamode.accounts SET is_active = true WHERE id = kit.test_uuid(108);

-- Re-authenticate as the now-active user
SELECT kit.authenticate_as('inactive_user');

-- Test that the now-active user can perform CRUD operations
SELECT is(
    (SELECT (supamode.insert_record('public', 'test_customers', '{"name": "Now Active", "email": "nowactive@test.com"}'::jsonb))->>'success')::boolean,
    true,
    'Previously inactive user can insert after being activated'
);

SELECT is(
    (SELECT (supamode.query_table('public', 'test_customers')).total_count >= 1),
    true,
    'Previously inactive user can query after being activated'
);

SELECT is(
    (SELECT (supamode.update_record_by_conditions('public', 'test_customers',
        '{"email": "nowactive@test.com"}'::jsonb,
        '{"name": "Active Updated"}'::jsonb))->>'success')::boolean,
    true,
    'Previously inactive user can update after being activated'
);

SELECT is(
    (SELECT (supamode.delete_record_by_conditions('public', 'test_customers',
        '{"email": "nowactive@test.com"}'::jsonb))->>'success')::boolean,
    true,
    'Previously inactive user can delete after being activated'
);

-- Test 23: Inactive user with direct account permissions still cannot access
select kit.authenticate_as('crud_admin');
SET ROLE postgres;

-- Deactivate the account again
UPDATE supamode.accounts SET is_active = false WHERE id = kit.test_uuid(108);

-- Give direct account permissions (to test that even direct permissions don't override inactive status)
INSERT INTO supamode.account_permissions (account_id, permission_id, is_grant) VALUES
    (kit.test_uuid(108), kit.test_uuid(311), true),  -- products select
    (kit.test_uuid(108), kit.test_uuid(312), true);  -- products insert

SELECT kit.authenticate_as('inactive_user');

-- Even with direct account permissions, inactive user should be blocked
SELECT throws_ilike(
    $$ SELECT supamode.query_table('public', 'test_products') $$,
    'Query execution failed for public.test_products: The user does not have permission to read this table%',
    'Inactive user with direct permissions still cannot query tables'
);

SELECT is(
    (SELECT (supamode.insert_record('public', 'test_products', '{"name": "Inactive Direct", "price": 10.00}'::jsonb))->>'success')::boolean,
    false,
    'Inactive user with direct permissions still cannot insert records'
);

-- Verify the error message contains information about insufficient permissions (due to inactive status)
SELECT ok(
    (SELECT (supamode.insert_record('public', 'test_products', '{"name": "Inactive Direct", "price": 10.00}'::jsonb))->>'error' ILIKE '%Permission denied%'),
    'Inactive user operations return appropriate error message about permissions'
);

SELECT finish();

ROLLBACK;