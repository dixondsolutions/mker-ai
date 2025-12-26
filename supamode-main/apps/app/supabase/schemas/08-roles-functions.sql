-- SECTION: CAN ACTION ROLE
-- In this section, we define the can action role function. This function is used to check if a user can modify a role. Uses SECURITY DEFINER to avoid infinite loops when the function is used within RLS policies.
create or replace function supamode.can_action_role (p_role_id UUID, p_action supamode.system_action) RETURNS BOOLEAN VOLATILE SECURITY DEFINER
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_current_user_max_rank INTEGER;
    v_target_role_rank      INTEGER;
    v_current_account_id        UUID;
BEGIN
    -- Basic validations
    IF p_role_id IS NULL OR p_action IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user has admin access
    IF NOT supamode.verify_admin_access() THEN
        RETURN FALSE;
    END IF;

    -- Check basic admin permission
    IF NOT supamode.has_admin_permission('role'::supamode.system_resource, p_action) THEN
        RETURN FALSE;
    END IF;

    v_current_account_id := supamode.get_current_user_account_id();
    IF v_current_account_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get target role rank (simple read)
    SELECT rank
    INTO v_target_role_rank
    FROM supamode.roles
    WHERE id = p_role_id;

    IF v_target_role_rank IS NULL THEN
        RETURN FALSE; -- Role doesn't exist
    END IF;

    -- Get user's max rank
    v_current_user_max_rank := supamode.get_user_max_role_rank(v_current_account_id);

    -- Simple comparison - user must have STRICTLY higher rank
    RETURN COALESCE(v_current_user_max_rank > v_target_role_rank, FALSE);
END;
$$ LANGUAGE plpgsql;

grant
execute on FUNCTION supamode.can_action_role to authenticated;

-- SECTION: CAN MODIFY ACCOUNT ROLE
-- This function checks if a user can modify the role of a specific account with proper privilege escalation prevention. Uses SECURITY DEFINER to avoid infinite loops when the function is used within RLS policies.
create or replace function supamode.can_modify_account_role (
  p_account_id UUID,
  p_target_account_id UUID,
  p_role_id UUID,
  p_action supamode.system_action
) RETURNS BOOLEAN SECURITY DEFINER
set
  row_security = off
set
  search_path = '' as $$
DECLARE
    v_user_max_rank    INTEGER;
    v_role_rank        INTEGER;
    v_target_max_rank  INTEGER;
    v_is_self_modification BOOLEAN;
BEGIN
    -- Input validation
    IF p_account_id IS NULL OR p_target_account_id IS NULL OR p_role_id IS NULL OR p_action IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user has admin access (JWT validation)
    IF NOT supamode.verify_admin_access() THEN
        RETURN FALSE;
    END IF;

    -- First check: Does user have admin permission to modify roles at all?
    IF NOT supamode.has_admin_permission('role'::supamode.system_resource, p_action) THEN
        RETURN FALSE;
    END IF;

    -- Determine if this is self-modification
    v_is_self_modification := (p_account_id = p_target_account_id);

    -- CANONICAL LOCKING: Lock all resources in consistent order
    -- This prevents deadlocks regardless of caller order
    PERFORM supamode.lock_resources_ordered(
            p_accounts := ARRAY [p_account_id, p_target_account_id]::UUID[],
            p_roles := ARRAY [p_role_id]::UUID[]
            );

    -- Get role rank (simple read)
    SELECT rank
    INTO v_role_rank
    FROM supamode.roles
    WHERE id = p_role_id;

    IF v_role_rank IS NULL THEN
        RETURN FALSE; -- Role doesn't exist
    END IF;

    v_user_max_rank := coalesce(supamode.get_user_max_role_rank(p_account_id), null);

    v_target_max_rank := coalesce(supamode.get_user_max_role_rank(p_target_account_id), 0);

    -- If the user has no roles, return false
    IF v_user_max_rank IS NULL THEN
        RETURN FALSE;
    END IF;

    -- RULE 1: User must have HIGHER OR EQUAL rank than the role being assigned/modified
    IF v_user_max_rank < v_role_rank THEN
        RETURN FALSE;
    END IF;

    -- RULE 2: Self-modification restrictions
    IF v_is_self_modification THEN
        CASE p_action
            WHEN 'delete' THEN -- Users cannot remove their own highest rank role (prevents lockout)
            IF v_role_rank = v_user_max_rank THEN
                RETURN FALSE;
            END IF;

            WHEN 'insert', 'update' THEN -- Users cannot assign themselves equal/higher roles (prevents escalation)
            IF v_role_rank >= v_user_max_rank THEN
                RETURN FALSE;
            END IF;

            ELSE -- Other actions allowed if user has higher rank
            NULL;
            END CASE;

        RETURN TRUE; -- Self-modification allowed for lower rank roles
    END IF;

    RETURN v_user_max_rank > v_target_max_rank;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in can_modify_account_role: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
grant
execute on FUNCTION supamode.can_modify_account_role to authenticated;

-- Indexes
create index idx_account_roles_account_id on supamode.account_roles (account_id);

create index idx_account_roles_role_id on supamode.account_roles (role_id);

-- Add a helper function to check if an account has a specific role
create or replace function supamode.account_has_role (p_account_id UUID, p_role_id UUID) RETURNS BOOLEAN SECURITY DEFINER
set
  row_security = off
set
  search_path = '' as $$
BEGIN
    RETURN EXISTS (SELECT 1
                   FROM supamode.account_roles
                   WHERE account_id = p_account_id
                     AND role_id = p_role_id
                     AND (valid_until IS NULL OR valid_until > NOW()));
END;
$$ LANGUAGE plpgsql;

grant
execute on FUNCTION supamode.account_has_role to authenticated,
service_role;

-- SECTION: GET CURRENT USER ROLE
-- In this section, we define the function to get the current user's role.
--
create or replace function supamode.get_current_user_role () RETURNS supamode.roles LANGUAGE plpgsql
set
  search_path = '' as $$
DECLARE
    v_role supamode.roles;
BEGIN
    SELECT r.*
    INTO v_role
    FROM supamode.roles r
             JOIN supamode.account_roles ar ON r.id = ar.role_id
    WHERE ar.account_id = supamode.get_current_user_account_id()
    LIMIT 1;

    RETURN v_role;
END;
$$;

grant execute on FUNCTION supamode.get_current_user_role to authenticated;