-- ==============================================================================
-- Combined Database Initialization Script
-- ChatBots + Supamode Full Stack
-- ==============================================================================
-- This script is executed after the base Supabase database is initialized.
-- It creates the Supamode schema and applies additional seeds.
-- ==============================================================================

-- ==============================================================================
-- SUPAMODE SCHEMA CREATION
-- ==============================================================================

-- Create supamode schema
CREATE SCHEMA IF NOT EXISTS supamode;

-- Grant necessary privileges
GRANT USAGE ON SCHEMA supamode TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- SUPAMODE ENUMS
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE supamode.system_resource AS ENUM (
        'account',
        'role',
        'permission',
        'log',
        'auth_user',
        'table',
        'system_setting'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE supamode.system_action AS ENUM (
        'select',
        'insert',
        'update',
        'delete'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE supamode.permission_type AS ENUM (
        'system',
        'data'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- SUPAMODE CONFIGURATION TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supamode.configuration (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Default configuration
INSERT INTO supamode.configuration (key, value, description)
VALUES ('requires_mfa', 'false', 'Whether MFA is required for Supamode access')
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- SUPAMODE ACCOUNTS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supamode.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{"language": "en-US", "timezone": "UTC"}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE supamode.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_select_self" ON supamode.accounts
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY "accounts_update_self" ON supamode.accounts
    FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid());

-- ==============================================================================
-- SUPAMODE ROLES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supamode.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    rank INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE supamode.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select" ON supamode.roles
    FOR SELECT TO authenticated
    USING (true);

-- ==============================================================================
-- SUPAMODE ACCOUNT ROLES (JUNCTION TABLE)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supamode.account_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES supamode.accounts(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES supamode.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES supamode.accounts(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(account_id, role_id)
);

ALTER TABLE supamode.account_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_roles_select" ON supamode.account_roles
    FOR SELECT TO authenticated
    USING (true);

-- ==============================================================================
-- SUPAMODE PERMISSION GROUPS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supamode.permission_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE supamode.permission_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permission_groups_select" ON supamode.permission_groups
    FOR SELECT TO authenticated
    USING (true);

-- ==============================================================================
-- SUPAMODE PERMISSIONS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supamode.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permission_type supamode.permission_type NOT NULL DEFAULT 'system',
    system_resource supamode.system_resource,
    schema_name TEXT,
    table_name TEXT,
    action supamode.system_action NOT NULL,
    scope TEXT DEFAULT 'table',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE supamode.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permissions_select" ON supamode.permissions
    FOR SELECT TO authenticated
    USING (true);

-- ==============================================================================
-- SUPAMODE PERMISSION GROUP PERMISSIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supamode.permission_group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES supamode.permission_groups(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES supamode.permissions(id) ON DELETE CASCADE,
    added_by UUID,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(group_id, permission_id)
);

ALTER TABLE supamode.permission_group_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pgp_select" ON supamode.permission_group_permissions
    FOR SELECT TO authenticated
    USING (true);

-- ==============================================================================
-- SUPAMODE ROLE PERMISSION GROUPS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supamode.role_permission_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES supamode.roles(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES supamode.permission_groups(id) ON DELETE CASCADE,
    assigned_by UUID,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(role_id, group_id)
);

ALTER TABLE supamode.role_permission_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rpg_select" ON supamode.role_permission_groups
    FOR SELECT TO authenticated
    USING (true);

-- ==============================================================================
-- SUPAMODE TABLE METADATA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS supamode.table_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_name TEXT NOT NULL DEFAULT 'public',
    table_name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    ordering INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    columns_config JSONB DEFAULT '{}'::jsonb,
    filters_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(schema_name, table_name)
);

ALTER TABLE supamode.table_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "table_metadata_select" ON supamode.table_metadata
    FOR SELECT TO authenticated
    USING (true);

-- ==============================================================================
-- SUPAMODE ADMIN ACCESS CHECK FUNCTION
-- ==============================================================================

CREATE OR REPLACE FUNCTION supamode.account_has_admin_access(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = user_id
        AND u.raw_app_meta_data->>'supamode_access' = 'true'
    ) INTO has_access;
    
    RETURN has_access;
END;
$$;

CREATE OR REPLACE FUNCTION supamode.verify_admin_access()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User is not authenticated';
    END IF;
    
    IF NOT supamode.account_has_admin_access(current_user_id) THEN
        RAISE EXCEPTION 'User does not have admin access';
    END IF;
    
    RETURN current_user_id;
END;
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION supamode.account_has_admin_access(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION supamode.verify_admin_access() TO authenticated, service_role;

-- ==============================================================================
-- SEED DATA: ROLES
-- ==============================================================================

INSERT INTO supamode.roles (name, description, rank)
VALUES 
    ('Root', 'Ultimate system access', 100),
    ('Admin', 'Administrative access to system functions', 90),
    ('Developer', 'Technical access for development', 80),
    ('Manager', 'Content management and basic admin functions', 70),
    ('Customer Support', 'Customer support functions', 60),
    ('Read Only', 'Read-only access to system data', 50)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- SEED DATA: SYSTEM PERMISSIONS
-- ==============================================================================

INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action)
VALUES 
    ('account:select', 'View accounts', 'system', 'account', 'select'),
    ('account:insert', 'Create accounts', 'system', 'account', 'insert'),
    ('account:update', 'Update accounts', 'system', 'account', 'update'),
    ('account:delete', 'Delete accounts', 'system', 'account', 'delete'),
    ('role:select', 'View roles', 'system', 'role', 'select'),
    ('role:insert', 'Create roles', 'system', 'role', 'insert'),
    ('role:update', 'Update roles', 'system', 'role', 'update'),
    ('role:delete', 'Delete roles', 'system', 'role', 'delete'),
    ('permission:select', 'View permissions', 'system', 'permission', 'select'),
    ('permission:insert', 'Create permissions', 'system', 'permission', 'insert'),
    ('permission:update', 'Update permissions', 'system', 'permission', 'update'),
    ('permission:delete', 'Delete permissions', 'system', 'permission', 'delete'),
    ('log:select', 'View audit logs', 'system', 'log', 'select'),
    ('auth_user:select', 'View auth users', 'system', 'auth_user', 'select'),
    ('auth_user:insert', 'Create auth users', 'system', 'auth_user', 'insert'),
    ('auth_user:update', 'Update auth users', 'system', 'auth_user', 'update'),
    ('auth_user:delete', 'Delete auth users', 'system', 'auth_user', 'delete'),
    ('table:select', 'View table data', 'system', 'table', 'select'),
    ('table:insert', 'Create table data', 'system', 'table', 'insert'),
    ('table:update', 'Update table data', 'system', 'table', 'update'),
    ('table:delete', 'Delete table data', 'system', 'table', 'delete'),
    ('system_setting:select', 'View system settings', 'system', 'system_setting', 'select'),
    ('system_setting:update', 'Update system settings', 'system', 'system_setting', 'update')
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- SEED DATA: CHATBOTS TABLE METADATA
-- ==============================================================================

INSERT INTO supamode.table_metadata (schema_name, table_name, display_name, description, ordering, is_visible)
VALUES 
    ('public', 'chatbots', 'Chatbots', 'AI chatbot configurations', 1, true),
    ('public', 'conversations', 'Conversations', 'User conversations with chatbots', 2, true),
    ('public', 'messages', 'Messages', 'Individual messages in conversations', 3, true),
    ('public', 'documents', 'Documents', 'Knowledge base documents', 4, true),
    ('public', 'documents_embeddings', 'Document Embeddings', 'Vector embeddings', 5, true),
    ('public', 'accounts', 'Accounts', 'User and team accounts', 10, true),
    ('public', 'accounts_memberships', 'Account Memberships', 'Team membership relationships', 11, true),
    ('public', 'roles', 'Roles', 'User roles', 12, true),
    ('public', 'subscriptions', 'Subscriptions', 'Billing subscriptions', 20, true),
    ('public', 'orders', 'Orders', 'Purchase orders', 21, true),
    ('public', 'billing_customers', 'Billing Customers', 'Customer billing info', 22, true),
    ('public', 'invitations', 'Invitations', 'Team invitations', 30, true),
    ('public', 'notifications', 'Notifications', 'User notifications', 31, true)
ON CONFLICT (schema_name, table_name) DO NOTHING;

-- ==============================================================================
-- Grant schema permissions
-- ==============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA supamode TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA supamode TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA supamode TO authenticated, service_role;

-- ==============================================================================
-- COMPLETE
-- ==============================================================================
-- The database is now initialized with:
-- 1. ChatBots application schema (from base Supabase migration)
-- 2. Supamode admin dashboard schema
-- 3. Base roles and permissions for Supamode
-- 4. Table metadata for ChatBots tables
--
-- To create an admin user:
-- 1. Sign up through the ChatBots application
-- 2. Update the user's app_metadata: 
--    UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"supamode_access": "true"}'::jsonb WHERE email = 'your@email.com';
-- 3. Create a Supamode account for the user:
--    INSERT INTO supamode.accounts (auth_user_id) SELECT id FROM auth.users WHERE email = 'your@email.com';
-- 4. Assign the Root role:
--    INSERT INTO supamode.account_roles (account_id, role_id) SELECT a.id, r.id FROM supamode.accounts a, supamode.roles r WHERE a.auth_user_id = (SELECT id FROM auth.users WHERE email = 'your@email.com') AND r.name = 'Root';
-- ==============================================================================


