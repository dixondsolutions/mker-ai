
-- Admin Access Management Functions
-- This migration adds functions to properly manage admin access by handling both JWT metadata and account creation

-- Function to grant admin access to a user
-- This function performs two operations in a transaction:
-- 1. Updates the user's app_metadata in auth.users to set supamode_access = 'true'
-- 2. Creates or activates an account in supamode.accounts if it doesn't exist
create or replace function supamode.grant_admin_access (
    p_user_id uuid
) returns jsonb
set search_path = ''
set row_security = off
language plpgsql
security definer
as $$
declare
    v_current_user_id uuid;
    v_result jsonb;
    v_existing_metadata jsonb;
    v_updated_metadata jsonb;
    v_account_exists boolean;
begin
    -- Get the current user's ID from JWT
    v_current_user_id := auth.uid();
    
    if v_current_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;
    
    -- Prevent users from granting admin access to themselves
    if v_current_user_id = p_user_id then
        return jsonb_build_object('success', false, 'error', 'Cannot grant admin access to yourself');
    end if;
    
    -- Check if current user has permission to insert accounts
    if not supamode.has_admin_permission('account'::supamode.system_resource, 'insert') then
        return jsonb_build_object('success', false, 'error', 'Insufficient permissions to grant admin access');
    end if;
    
    -- Get current app_metadata from auth.users
    select raw_app_meta_data into v_existing_metadata
    from auth.users
    where id = p_user_id;
    
    if v_existing_metadata is null then
        return jsonb_build_object('success', false, 'error', 'User not found');
    end if;
    
    -- Update app_metadata to include admin_access = 'true'
    v_updated_metadata := coalesce(v_existing_metadata, '{}'::jsonb) || jsonb_build_object('supamode_access', 'true');
    
    -- Update the user's app_metadata
    update auth.users 
    set raw_app_meta_data = v_updated_metadata,
        updated_at = now()
    where id = p_user_id;
    
    if not found then
        return jsonb_build_object('success', false, 'error', 'Failed to update user metadata');
    end if;
    
    -- Check if account already exists in supamode.accounts
    select exists(
        select 1 from supamode.accounts 
        where auth_user_id = p_user_id
    ) into v_account_exists;
    
    if not v_account_exists then
        -- Create account in supamode.accounts
        insert into supamode.accounts (auth_user_id, is_active)
        values (p_user_id, true)
        on conflict (auth_user_id) do update set
            is_active = true,
            updated_at = now();
    else
        -- Ensure existing account is active
        update supamode.accounts 
        set is_active = true,
            updated_at = now()
        where auth_user_id = p_user_id;
    end if;
    
    -- Create audit log
    perform supamode.create_audit_log(
        'grant_admin_access',
        'supamode', 
        'accounts',
        p_user_id::text,
        null, -- old_data
        jsonb_build_object(
            'target_user_id', p_user_id,
            'action', 'grant_admin_access',
            'granted_by', v_current_user_id,
            'admin_access', true
        ),
        'info'::supamode.audit_log_severity,
        jsonb_build_object('operation_type', 'admin_access_management')
    );
    
    return jsonb_build_object('success', true, 'message', 'Admin access granted successfully');
    
exception when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

-- Function to revoke admin access from a user
-- This function performs two operations in a transaction:
-- 1. Updates the user's app_metadata in auth.users to set admin_access = 'false'
-- 2. Optionally deactivates the account in supamode.accounts (but preserves the record)
create or replace function supamode.revoke_admin_access (
    p_user_id uuid,
    p_deactivate_account boolean default false
) returns jsonb
set search_path = ''
set row_security = off
language plpgsql
security definer
as $$
declare
    v_current_user_id uuid;
    v_result jsonb;
    v_existing_metadata jsonb;
    v_updated_metadata jsonb;
    v_can_action_account boolean;
    v_target_account_id uuid;
begin
    -- Get the current user's ID from JWT
    v_current_user_id := auth.uid();
    
    if v_current_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;
    
    -- Prevent users from revoking admin access from themselves
    if v_current_user_id = p_user_id then
        return jsonb_build_object('success', false, 'error', 'Cannot revoke admin access from yourself');
    end if;
    
    -- Check if current user has permission to delete accounts
    if not supamode.has_admin_permission('account'::supamode.system_resource, 'delete') then
        return jsonb_build_object('success', false, 'error', 'Insufficient permissions to revoke admin access');
    end if;
    
    -- Check if current user can action the target account (role hierarchy check)
    -- First get the target account ID
    select id into v_target_account_id
    from supamode.accounts
    where auth_user_id = p_user_id;
    
    if v_target_account_id is not null then
        select supamode.can_action_account(v_target_account_id, 'update') into v_can_action_account;
        
        if not v_can_action_account then
            return jsonb_build_object('success', false, 'error', 'Cannot revoke admin access from users with equal or higher role rank');
        end if;
    end if;
    -- If no account exists, we can proceed (they don't have admin access anyway)
    
    -- Get current app_metadata from auth.users
    select raw_app_meta_data into v_existing_metadata
    from auth.users
    where id = p_user_id;
    
    if v_existing_metadata is null then
        return jsonb_build_object('success', false, 'error', 'User not found');
    end if;
    
    -- Update app_metadata to set supamode_access = 'false'
    v_updated_metadata := coalesce(v_existing_metadata, '{}'::jsonb) || jsonb_build_object('supamode_access', 'false');
    
    -- Update the user's app_metadata
    update auth.users 
    set raw_app_meta_data = v_updated_metadata,
        updated_at = now()
    where id = p_user_id;
    
    if not found then
        return jsonb_build_object('success', false, 'error', 'Failed to update user metadata');
    end if;
    
    -- Optionally deactivate the account (but preserve the record and roles)
    if p_deactivate_account then
        update supamode.accounts 
        set is_active = false,
            updated_at = now()
        where auth_user_id = p_user_id;
    end if;
    
    -- Create audit log
    perform supamode.create_audit_log(
        'revoke_admin_access',
        'supamode', 
        'accounts',
        p_user_id::text,
        null, -- old_data
        jsonb_build_object(
            'target_user_id', p_user_id,
            'action', 'revoke_admin_access',
            'revoked_by', v_current_user_id,
            'deactivated_account', p_deactivate_account,
            'admin_access', false
        ),
        'info'::supamode.audit_log_severity,
        jsonb_build_object('operation_type', 'admin_access_management')
    );
    
    return jsonb_build_object('success', true, 'message', 'Admin access revoked successfully');
    
exception when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function supamode.grant_admin_access(uuid) to authenticated;

grant execute on function supamode.revoke_admin_access(uuid, boolean) to authenticated;