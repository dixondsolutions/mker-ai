
-- SECTION: PERMISSIONS
-- This function is used to check if a user has permission for a specific permission. It can be reused for both system and data permissions. Uses SECURITY DEFINER to avoid infinite loops when the function is used within RLS policies.
create or replace function supamode.has_permission (p_account_id UUID, p_permission_id UUID) RETURNS BOOLEAN security definer
set
  row_security = off
set
  statement_timeout = '5s'
set
  lock_timeout = '3s'
set
  SEARCH_PATH to '' as $$
BEGIN
    -- First check for explicit denials (which take precedence)
    IF EXISTS (SELECT 1
               FROM supamode.account_permissions ap
               WHERE ap.account_id = p_account_id
                 AND ap.permission_id = p_permission_id
                 AND ap.is_grant = FALSE
                 AND (ap.valid_until IS NULL OR ap.valid_until > NOW())) THEN
        RETURN FALSE; -- Explicit denial takes precedence
    END IF;

    -- Check for any valid permission grant path
    RETURN EXISTS (
        -- Direct permission grants
        SELECT 1
        FROM supamode.account_permissions ap
        WHERE ap.account_id = p_account_id
          AND ap.permission_id = p_permission_id
          AND ap.is_grant = TRUE
          AND (ap.valid_until IS NULL OR ap.valid_until > NOW())

        UNION

        -- Role-based permissions (direct path)
        SELECT 1
        FROM supamode.account_roles ar
                 JOIN supamode.role_permissions rp ON ar.role_id = rp.role_id
        WHERE ar.account_id = p_account_id
          AND rp.permission_id = p_permission_id
          AND (ar.valid_until IS NULL OR ar.valid_until > NOW())
          AND (rp.valid_until IS NULL OR rp.valid_until > NOW())

        UNION

        -- Permission group path
        SELECT 1
        FROM supamode.account_roles ar
                 JOIN supamode.role_permission_groups rpg ON ar.role_id = rpg.role_id
                 JOIN supamode.permission_group_permissions pgp ON rpg.group_id = pgp.group_id
        WHERE ar.account_id = p_account_id
          AND pgp.permission_id = p_permission_id
          AND (ar.valid_until IS NULL OR ar.valid_until > NOW())
          AND (rpg.valid_until IS NULL OR rpg.valid_until > NOW()));
END;
$$ LANGUAGE plpgsql;

grant
execute on function supamode.has_permission to authenticated,
service_role;

-- SECTION: SYSTEM PERMISSIONS
-- This function is used to check if a user has system permission for a specific system resource. System resources are resources that belong to Supamode itself, not the end application being managed. For example: table, role, permission, etc. Uses SECURITY DEFINER to avoid infinite loops when the function is used within RLS policies.
create or replace function supamode.has_admin_permission (
  p_resource supamode.system_resource,
  p_action supamode.system_action
) RETURNS BOOLEAN security definer
set
  row_security = off
set
  SEARCH_PATH to '' as $$
DECLARE
    v_permission_id UUID;
BEGIN
    -- Check if user has admin access
    IF NOT supamode.verify_admin_access() THEN
        RETURN FALSE;
    END IF;

    -- Find the permission key for the resource and action
    RETURN EXISTS (SELECT 1
                   FROM supamode.permissions p
                   WHERE permission_type = 'system'
                     AND system_resource = p_resource
                     AND (action = p_action OR action = '*')
                     AND supamode.has_permission(supamode.get_current_user_account_id(), p.id));
END;
$$ LANGUAGE plpgsql;

grant
execute on FUNCTION supamode.has_admin_permission to authenticated,
service_role;

-- Check storage access using path patterns in DATA permissions
create or replace function supamode.has_storage_permission (
  p_bucket_name TEXT,
  p_action supamode.system_action,
  p_object_path TEXT
) RETURNS BOOLEAN SECURITY DEFINER
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_account_id       UUID;
    v_user_id          TEXT;
    v_permission       RECORD;
    v_allowed_bucket   TEXT;
    v_path_pattern     TEXT;
    v_resolved_pattern TEXT;
BEGIN
    -- Basic validation
    IF NOT supamode.verify_admin_access() THEN
        RETURN FALSE;
    END IF;

    IF p_object_path IS NULL or p_object_path = '' THEN
        RETURN FALSE;
    END IF;

    if p_bucket_name is null or p_bucket_name = '' then
        return false;
    end if;

    v_account_id := supamode.get_current_user_account_id();
    IF v_account_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get user ID for path variable substitution
    v_user_id := (SELECT auth.uid()::TEXT);

    -- Check storage permissions (DATA permissions with storage scope)
    FOR v_permission IN
        SELECT p.metadata
        FROM supamode.permissions p
        WHERE p.permission_type = 'data'
          AND p.scope = 'storage'
          AND (p.action = p_action OR p.action = '*')
          AND supamode.has_permission(v_account_id, p.id)
        LOOP
            -- Extract bucket and path constraints from metadata
            v_allowed_bucket := v_permission.metadata ->> 'bucket_name';
            v_path_pattern := v_permission.metadata ->> 'path_pattern';

            -- Check bucket constraint
            IF v_allowed_bucket IS NOT NULL
                AND v_allowed_bucket != '*'
                AND v_allowed_bucket != p_bucket_name THEN
                CONTINUE;
            END IF;

            -- Check path pattern constraint
            IF v_path_pattern IS NOT NULL THEN
                -- Substitute variables in pattern
                v_resolved_pattern := v_path_pattern;
                v_resolved_pattern := replace(v_resolved_pattern, '{{user_id}}', v_user_id);
                v_resolved_pattern := replace(v_resolved_pattern, '{{account_id}}', v_account_id::TEXT);

                -- Convert wildcards to SQL LIKE patterns
                v_resolved_pattern := replace(v_resolved_pattern, '*', '%');

                -- Check if path matches pattern
                IF NOT (p_object_path LIKE v_resolved_pattern) THEN
                    CONTINUE;
                END IF;
            END IF;

            -- All constraints passed - user has access
            RETURN TRUE;
        END LOOP;

    -- No matching permission found
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

grant
execute on FUNCTION supamode.has_storage_permission to authenticated;


-- SECTION: DATA PERMISSIONS
-- This function is used to check if a user has data permission for a specific data resource. Data resources are data that belongs to the end application being managed, not Supamode itself. Uses SECURITY DEFINER to avoid infinite loops when the function is used within RLS policies.
create or replace function supamode.has_data_permission (
  p_action supamode.system_action,
  p_schema_name VARCHAR,
  p_table_name VARCHAR default null
) RETURNS BOOLEAN security definer
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_permission_id UUID;
BEGIN
    -- Check if user has admin access
    IF NOT supamode.verify_admin_access() THEN
        RETURN FALSE;
    END IF;

    -- Table-level permission
    IF p_schema_name IS NOT NULL AND p_table_name IS NOT NULL THEN
        IF exists(SELECT 1
                  FROM supamode.permissions p
                  WHERE permission_type = 'data'
                    AND (action = p_action OR action = '*')
                    AND scope = 'table'
                    AND (schema_name = p_schema_name OR schema_name = '*')
                    AND (table_name = p_table_name OR table_name = '*')
                    AND supamode.has_permission(supamode.get_current_user_account_id(), p.id))
        THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

grant
execute on FUNCTION supamode.has_data_permission to authenticated,
service_role;


-- SECTION: GET USER MAX ROLE rank
-- In this section, we define the get user max role rank function. This function is used to get the maximum role rank for a specific account.
create or replace function supamode.get_user_max_role_rank (p_account_id UUID) RETURNS INTEGER
set
  search_path = '' as $$
DECLARE
    v_max_rank INTEGER;
BEGIN
    -- Input validation
    IF p_account_id IS NULL THEN
        RETURN null;
    END IF;

    -- Simple query, no locks - MVCC handles consistency
    SELECT MAX(r.rank)
    INTO v_max_rank
    FROM supamode.account_roles ar
             JOIN supamode.roles r ON ar.role_id = r.id
    WHERE ar.account_id = p_account_id
      AND (ar.valid_until IS NULL OR ar.valid_until > NOW())
      AND (r.valid_until IS NULL OR r.valid_until > NOW());

    RETURN COALESCE(v_max_rank, null);
END;
$$ LANGUAGE plpgsql;

-- SECTION: CAN VIEW PERMISSION GROUP
-- In this section, we define the can view permission group function. This function is used to check if a user can view a specific permission group.
create or replace function supamode.can_view_permission_group (p_account_id UUID, p_group_id UUID) RETURNS BOOLEAN security definer
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_user_max_rank INTEGER;
BEGIN
    -- Check if user has admin access
    IF NOT supamode.verify_admin_access() THEN
        RETURN FALSE;
    END IF;

    -- Get the user's maximum role rank
    v_user_max_rank := supamode.get_user_max_role_rank(p_account_id);

    RETURN EXISTS (
        -- Access through roles
        SELECT 1
        FROM supamode.account_roles ar
                 JOIN supamode.role_permission_groups rpg ON ar.role_id = rpg.role_id
        WHERE ar.account_id = p_account_id
          AND rpg.group_id = p_group_id)
        -- Access as creator
        OR EXISTS (SELECT 1
                   FROM supamode.permission_groups pg
                   WHERE pg.id = p_group_id
                     AND pg.created_by = p_account_id)
        -- Access based on role rank (including equal rank)
        OR EXISTS (SELECT 1
                   FROM supamode.role_permission_groups rpg
                            JOIN supamode.roles r ON rpg.role_id = r.id
                   WHERE rpg.group_id = p_group_id
                     AND r.rank <= v_user_max_rank);
END;
$$ LANGUAGE plpgsql;

grant
execute on FUNCTION supamode.can_view_permission_group to authenticated,
service_role;

-- SECTION: LOCK ORDERING UTILITIES
-- Create a function to lock multiple resources in a consistent order
create or replace function supamode.lock_resources_ordered (
  p_accounts UUID[] default '{}'::UUID[],
  p_roles UUID[] default '{}'::UUID[],
  p_permission_groups UUID[] default '{}'::UUID[],
  p_permissions UUID[] default '{}'::UUID[]
) RETURNS VOID SECURITY DEFINER
set
  row_security = off
set
  search_path = '' as $$
BEGIN
    -- Order and lock accounts
    IF array_length(p_accounts, 1) IS NOT NULL THEN
        PERFORM id
        FROM supamode.accounts
        WHERE id = ANY (p_accounts)
        ORDER BY id
        FOR UPDATE;
    END IF;

    -- Order and lock roles
    IF array_length(p_roles, 1) IS NOT NULL THEN
        PERFORM id
        FROM supamode.roles
        WHERE id = ANY (p_roles)
        ORDER BY id
        FOR UPDATE;
    END IF;

    -- Order and lock permission groups
    IF array_length(p_permission_groups, 1) IS NOT NULL THEN
        PERFORM id
        FROM supamode.permission_groups
        WHERE id = ANY (p_permission_groups)
        ORDER BY id
        FOR UPDATE;
    END IF;

    -- Order and lock permissions
    IF array_length(p_permissions, 1) IS NOT NULL THEN
        PERFORM id
        FROM supamode.permissions
        WHERE id = ANY (p_permissions)
        ORDER BY id
        FOR UPDATE;
    END IF;
END;
$$ LANGUAGE plpgsql;

grant
execute on FUNCTION supamode.lock_resources_ordered to authenticated;

-- SECTION: CAN ACTION ACCOUNT
-- In this section, we define the can action account function. This function is used to check if a user can action a specific account. Uses SECURITY DEFINER to avoid infinite loops when the function is used within RLS policies.
create or replace function supamode.can_action_account (
  p_target_account_id uuid,
  p_action supamode.system_action
) RETURNS boolean SECURITY DEFINER
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_account_id            UUID;
    v_account_role_rank int;
    v_target_role_rank  int;
BEGIN
    -- Basic validation
    IF p_target_account_id IS NULL OR p_action IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Verify admin access and permissions
    IF NOT supamode.has_admin_permission('account'::supamode.system_resource, p_action) THEN
        RETURN FALSE;
    END IF;

    v_account_id := supamode.get_current_user_account_id();
    IF v_account_id IS NULL OR v_account_id = p_target_account_id THEN
        RETURN FALSE;
    END IF;

    -- Self-modification rules
    IF v_account_id = p_target_account_id THEN
        -- Cannot delete own account
        IF p_action = 'delete' THEN
            RETURN FALSE;
        END IF;
        RETURN TRUE; -- Other self-modifications allowed
    END IF;

    -- Get priorities (simple reads)
    v_account_role_rank := supamode.get_user_max_role_rank(v_account_id);
    v_target_role_rank := coalesce(supamode.get_user_max_role_rank(p_target_account_id), 0);

    -- Higher role rank can action lower rank accounts
    RETURN v_account_role_rank > v_target_role_rank;
END;
$$ LANGUAGE plpgsql;

grant
execute on FUNCTION supamode.can_action_account to authenticated,
service_role;

-- SECTION: CAN MODIFY PERMISSION
-- In this section, we define the can modify permission function. This function is used to check if a user can modify a specific permission. Uses SECURITY DEFINER to avoid infinite loops when the function is used within RLS policies.
create or replace function supamode.can_modify_permission (
  p_permission_id UUID,
  p_action supamode.system_action default 'update'
) RETURNS BOOLEAN security definer
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_user_max_rank             INTEGER;
    v_highest_role_using_permission INTEGER;
    v_permission_locked             RECORD;
BEGIN
    IF NOT supamode.verify_admin_access() THEN
        RETURN FALSE;
    END IF;

    -- Lock the permission
    SELECT id
    INTO v_permission_locked
    FROM supamode.permissions
    WHERE id = p_permission_id
        FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- First check: Does user have admin permission to manage permissions?
    IF NOT supamode.has_admin_permission('permission'::supamode.system_resource, p_action) THEN
        RETURN FALSE;
    END IF;

    -- Get user's max rank
    v_user_max_rank := supamode.get_user_max_role_rank(supamode.get_current_user_account_id());

    -- Find the highest rank role that uses this permission (with locking)
    SELECT r.rank
    INTO v_highest_role_using_permission
    FROM supamode.role_permissions rp
             JOIN supamode.roles r ON rp.role_id = r.id
    WHERE rp.permission_id = p_permission_id
        FOR SHARE;
    -- Just reading, so SHARE is enough

    -- If no roles use this permission, default to 0
    v_highest_role_using_permission := COALESCE(v_highest_role_using_permission, 0);

    -- User must have higher rank than any role using this permission
    RETURN v_user_max_rank > v_highest_role_using_permission;
END;
$$ LANGUAGE plpgsql;

grant
execute on FUNCTION supamode.can_modify_permission to authenticated;

-- SECTION: CAN DELETE PERMISSION
-- In this section, we define the can delete permission function. This function is used to check if a user can delete a specific permission.
create or replace function supamode.can_delete_permission (p_permission_id UUID) RETURNS BOOLEAN VOLATILE
set
  search_path = '' as $$
DECLARE
    v_user_max_rank             INTEGER;
    v_highest_role_using_permission INTEGER;
    v_is_in_use                     BOOLEAN;
BEGIN
    IF NOT supamode.verify_admin_access() THEN
        RETURN FALSE;
    END IF;

    -- Basic modification check first
    IF NOT supamode.can_modify_permission(p_permission_id, 'delete') THEN
        RETURN FALSE;
    END IF;

    -- Additional checks for deletion:

    -- Check if permission is in use by permission groups
    SELECT EXISTS (SELECT 1
                   FROM supamode.permission_group_permissions
                   WHERE permission_id = p_permission_id)
    INTO v_is_in_use;

    IF v_is_in_use THEN
        -- Permission is in use by permission groups - require escalation instead of direct deletion
        RETURN FALSE;
    END IF;

    -- Check if permission is in use by roles
    SELECT EXISTS (SELECT 1
                   FROM supamode.role_permissions
                   WHERE permission_id = p_permission_id)
    INTO v_is_in_use;

    IF v_is_in_use THEN
        -- Permission is in use by roles - require escalation or disallow
        RETURN FALSE;
    END IF;

    -- Check if permission is directly assigned to accounts
    SELECT EXISTS (SELECT 1
                   FROM supamode.account_permissions
                   WHERE permission_id = p_permission_id)
    INTO v_is_in_use;

    IF v_is_in_use THEN
        -- Permission is directly assigned to accounts - require escalation instead of direct deletion
        RETURN FALSE;
    END IF;

    -- If we get here, permission can be safely deleted
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
grant
execute on FUNCTION supamode.can_delete_permission to authenticated;

-- SECTION: CAN MODIFY PERMISSION GROUP PERMISSIONS
-- In this section, we define the can modify permission group permissions function. This function is used to check if a user can modify the permissions of a specific permission group. Uses SECURITY DEFINER to avoid infinite loops when the function is used within RLS policies.
create or replace function supamode.can_modify_permission_group_permissions (p_group_id UUID, p_action supamode.system_action) RETURNS BOOLEAN security definer
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_user_max_rank             INTEGER;
    v_role_using_group_max_rank INTEGER;
BEGIN
    -- First check: Does user have admin permission to manage permission groups?
    IF NOT supamode.has_admin_permission('permission'::supamode.system_resource, p_action) THEN
        raise exception 'You do not have permission to manage permission groups';
    END IF;

    -- Check user rank
    v_user_max_rank := supamode.get_user_max_role_rank(supamode.get_current_user_account_id());

    if v_user_max_rank is null then
        raise exception 'This user does not have any roles';
    end if;

    -- get the highest rank role that uses this group
    select max(r.rank)
    into v_role_using_group_max_rank
    from supamode.role_permission_groups rpg
             join supamode.roles r on rpg.role_id = r.id
    where rpg.group_id = p_group_id;

    if coalesce(v_role_using_group_max_rank, 0) > v_user_max_rank then
        raise exception 'This user cannot modify this permission group because it is used by a role with a higher rank than their own.';
    end if;

    return true;
END;
$$ LANGUAGE plpgsql;

grant
execute on function supamode.can_modify_permission_group_permissions to authenticated;

-- SECTION: CAN MODIFY PERMISSION GROUP
-- In this section, we define the can modify permission group function. This function is used to check if a user can modify a specific permission group. Uses SECURITY DEFINER to avoid infinite loops when the function is used within RLS policies.
create or replace function supamode.can_modify_permission_group (p_group_id UUID, p_action supamode.system_action) RETURNS BOOLEAN SECURITY DEFINER
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_user_max_rank     INTEGER;
    v_current_account_id    UUID;
    v_user_has_this_group   BOOLEAN;
    v_group_locked          RECORD;
    v_highest_role_rank INTEGER;
BEGIN
    -- First check: Does user have admin permission to manage permission groups?
    IF NOT supamode.has_admin_permission('permission'::supamode.system_resource, p_action) THEN
        RETURN FALSE;
    END IF;

    -- Lock the permission group
    SELECT id, created_by
    INTO v_group_locked
    FROM supamode.permission_groups
    WHERE id = p_group_id
        FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Get the current account ID
    v_current_account_id := supamode.get_current_user_account_id();

    -- Get the user's maximum role rank
    v_user_max_rank := supamode.get_user_max_role_rank(v_current_account_id);

    IF v_user_max_rank IS NULL THEN
        RAISE EXCEPTION 'This user does not have any roles';
    END IF;

    -- For DELETE operations, check if user has this permission group through any of their roles
    IF p_action = 'delete' THEN
        SELECT EXISTS (SELECT 1
                       FROM supamode.account_roles ar
                                JOIN supamode.role_permission_groups rpg ON ar.role_id = rpg.role_id
                       WHERE ar.account_id = v_current_account_id
                         AND rpg.group_id = p_group_id
                           FOR SHARE -- Just checking
        )
        INTO v_user_has_this_group;

        -- User should not be able to delete groups they are part of
        IF v_user_has_this_group THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- 🔒 SECURITY FIX: Find the HIGHEST rank role that uses this group
    -- First lock the role-group relationships to prevent concurrent changes
    PERFORM 1
    FROM supamode.role_permission_groups rpg
    WHERE rpg.group_id = p_group_id
        FOR SHARE;

    -- Then get the highest rank (without locking since we already locked above)
    SELECT MAX(r.rank)
    INTO v_highest_role_rank
    FROM supamode.role_permission_groups rpg
             JOIN supamode.roles r ON rpg.role_id = r.id
    WHERE rpg.group_id = p_group_id;

    -- If no roles use this group, check if user created it
    IF v_highest_role_rank IS NULL THEN
        RETURN v_group_locked.created_by = v_current_account_id;
    END IF;

    IF p_action = 'delete' THEN
        -- For DELETE: User must have STRICTLY HIGHER rank than ALL roles using the group
        -- This prevents users from deleting groups used by equal or higher rank roles
        RETURN v_user_max_rank > v_highest_role_rank;
    ELSE
        -- For UPDATE/INSERT: User must have HIGHER OR EQUAL rank
        -- This allows users to modify groups assigned to their own role level
        RETURN v_user_max_rank >= v_highest_role_rank;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- SECTION: CAN VIEW ROLE PERMISSION GROUP
-- In this section, we define the can view role permission group function. This function is used to check if a user can view a specific role permission group.
create or replace function supamode.can_view_role_permission_group (p_account_id UUID, p_role_id UUID) RETURNS BOOLEAN
set
  search_path = '' as $$
DECLARE
    v_user_max_rank INTEGER;
BEGIN
    -- Get the user's maximum role rank
    v_user_max_rank := supamode.get_user_max_role_rank(p_account_id);

    RETURN EXISTS (
        -- Access through roles
        SELECT 1
        FROM supamode.account_roles ar
        WHERE ar.account_id = p_account_id
          AND ar.role_id = p_role_id)
        -- Access based on role rank (including equal rank)
        OR EXISTS (SELECT 1
                   FROM supamode.roles r
                   WHERE r.id = p_role_id
                     AND r.rank <= v_user_max_rank);
END;
$$ LANGUAGE plpgsql;

-- SECTION: CAN MODIFY ROLE PERMISSION GROUP
-- In this section, we define the can modify role permission group function. This function is used to check if a user can modify a specific role permission group.
create or replace function supamode.can_modify_role_permission_group (
  p_account_id UUID,
  p_role_id UUID,
  p_action supamode.system_action
) RETURNS BOOLEAN VOLATILE
set
  search_path = '' as $$
DECLARE
    v_user_max_rank INTEGER;
BEGIN
    -- First check: Does user have admin permission to modify roles at all?
    IF NOT supamode.has_admin_permission('role'::supamode.system_resource, p_action) THEN
        RETURN FALSE;
    END IF;

    -- Get the user's maximum role rank
    v_user_max_rank := supamode.get_user_max_role_rank(p_account_id);

    RETURN EXISTS (
        -- Access based on role rank (strictly higher rank only)
        SELECT 1
        FROM supamode.roles r
        WHERE r.id = p_role_id
          AND r.rank < v_user_max_rank);
END;
$$ LANGUAGE plpgsql;

-- SECTION: CAN DELETE ROLE
-- In this section, we define the can delete role function. This function is used to check if a user can delete a specific role.
create or replace function supamode.can_delete_role (p_role_id UUID) RETURNS BOOLEAN
set
  search_path = '' as $$
DECLARE
    v_user_max_rank  INTEGER;
    v_role_rank      INTEGER;
    v_user_has_role      BOOLEAN;
    v_current_account_id UUID;
BEGIN
    -- Basic checks
    IF p_role_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check admin access
    IF NOT supamode.verify_admin_access() THEN
        RETURN FALSE;
    END IF;

    -- Check basic admin permission
    IF NOT supamode.has_admin_permission('role'::supamode.system_resource, 'delete'::supamode.system_action) THEN
        RETURN FALSE;
    END IF;

    v_current_account_id := supamode.get_current_user_account_id();
    IF v_current_account_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get role rank (simple read)
    SELECT rank
    INTO v_role_rank
    FROM supamode.roles
    WHERE id = p_role_id;

    IF v_role_rank IS NULL THEN
        RETURN FALSE; -- Role doesn't exist
    END IF;

    -- Check if user has this role (simple read)
    SELECT EXISTS (SELECT 1
                   FROM supamode.account_roles
                   WHERE account_id = v_current_account_id
                     AND role_id = p_role_id
                     AND (valid_until IS NULL OR valid_until > NOW()))
    INTO v_user_has_role;

    IF v_user_has_role THEN
        RETURN FALSE; -- Can't delete own role
    END IF;

    -- Get user's max rank
    v_user_max_rank := supamode.get_user_max_role_rank(v_current_account_id);

    -- Simple comparison - user must have higher rank
    RETURN v_user_max_rank > v_role_rank;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
grant
execute on FUNCTION supamode.can_delete_role to authenticated;


-- SECTION: UPDATE ACCOUNT ROLES rank CHECK
-- In this section, we define the update account roles rank check function. This function is used to check if the user can update the rank of a role.
create or replace function supamode.update_account_roles_rank_check () RETURNS trigger SECURITY DEFINER
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_user_max_rank  integer;
    v_current_account_id UUID;
BEGIN
    v_current_account_id := supamode.get_current_user_account_id();
    IF v_current_account_id IS NULL THEN
        RAISE EXCEPTION 'No current user account found';
    END IF;

    -- Get the user's maximum role rank
    v_user_max_rank := supamode.get_user_max_role_rank(v_current_account_id);

    -- Check if the new rank is higher than or equal to the user's maximum role rank
    IF NEW.rank >= v_user_max_rank THEN
        RAISE EXCEPTION 'Cannot modify a role with a rank higher than or equal to your maximum role rank (%). Your max rank: %, Role rank: %',
            v_user_max_rank, v_user_max_rank, NEW.rank;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to check if the user can update the rank of a role
create trigger update_account_roles_rank_check before
update on supamode.roles for each row
execute function supamode.update_account_roles_rank_check ();

-- SECTION: GET AUTH USERS PERMISSIONS
-- In this section, we define the get auth users permissions function. This function is used to get the permissions for the Auth users in Supabase.
-- Add can_insert permission to the get_current_user_auth_users_permissions function
create or replace function supamode.get_current_user_auth_users_permissions () returns jsonb language plpgsql
set
  search_path = '' as $$
declare
    v_can_read   boolean;
    v_can_update boolean;
    v_can_delete boolean;
    v_can_insert boolean;
begin
    select supamode.has_admin_permission('auth_user'::supamode.system_resource, 'select'::supamode.system_action)
    into v_can_read;

    select supamode.has_admin_permission('auth_user'::supamode.system_resource, 'update'::supamode.system_action)
    into v_can_update;

    select supamode.has_admin_permission('auth_user'::supamode.system_resource, 'delete'::supamode.system_action)
    into v_can_delete;

    select supamode.has_admin_permission('auth_user'::supamode.system_resource, 'insert'::supamode.system_action)
    into v_can_insert;

    return jsonb_build_object('can_read', v_can_read, 'can_update', v_can_update, 'can_delete', v_can_delete,
                              'can_insert', v_can_insert);
end;
$$;

grant
execute on function supamode.get_current_user_auth_users_permissions to authenticated;