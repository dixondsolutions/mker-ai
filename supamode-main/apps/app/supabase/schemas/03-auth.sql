
/*
 * supamode.is_aal2
 * Check if the user has aal2 access
 */
create or replace function supamode.is_aal2 () returns boolean
set
  search_path = '' as $$
declare
    is_aal2 boolean;
begin
    select auth.jwt() ->> 'aal' = 'aal2' into is_aal2;

    return coalesce(is_aal2, false);
end
$$ language plpgsql;

-- Grant access to the function to authenticated users
grant
execute on function supamode.is_aal2 () to authenticated;

/*
 * supamode.is_mfa_compliant
 * Check if the user meets MFA requirements if they have MFA enabled.
 * If the user has MFA enabled, then the user must have aal2 enabled. Otherwise, the user must have aal1 enabled (default behavior).
 */
create or replace function supamode.is_mfa_compliant () returns boolean
set
  row_security = off
set
  search_path = '' as $$
begin
    return array [(select auth.jwt() ->> 'aal')] <@ (select case
                                                                when count(id) > 0 then array ['aal2']
                                                                else array ['aal1', 'aal2']
                                                                end as aal
                                                     from auth.mfa_factors
                                                     where ((select auth.uid()) = auth.mfa_factors.user_id)
                                                       and auth.mfa_factors.status = 'verified');
end
$$ language plpgsql security definer;

-- Grant access to the function to authenticated users
grant
execute on function supamode.is_mfa_compliant () to authenticated;

-- Lightweight function that checks if user has admin_access flag in JWT
create or replace function supamode.account_has_admin_access () returns boolean
set
  search_path = '' as $$
begin
    return (auth.jwt() ->> 'app_metadata')::jsonb ->> 'supamode_access' = 'true';
end
$$ language plpgsql;

grant
execute on function supamode.account_has_admin_access () to authenticated;

-- SECTION: CHECK ADMIN ACCESS
-- In this section, we define the check admin access function. This function is used to check if the user has admin access by checking the app_metadata of the JWT. This is a preliminary, cheap way to check if the user has admin access. Remaining checks are that using supamode.has_data_permission and supamode.has_admin_permission.
-- In addition, it checks if the user has MFA enabled and if MFA is required for admin access.
create or replace function supamode.verify_admin_access () RETURNS boolean
set
  search_path = '' as $$
declare
    has_admin_access boolean;
    requires_mfa     text;
    has_mfa          boolean;
begin
    -- Check if user has admin access flag in JWT
    select supamode.account_has_admin_access() into has_admin_access;

    -- Early return if user doesn't have admin access
    if not coalesce(has_admin_access, false) then
        return false;
    end if;

    -- Get MFA requirement from configuration
    select lower(supamode.get_configuration_value('requires_mfa')) into requires_mfa;

    -- Validate requires_mfa value to ensure it's either 'true' or 'false'
    if requires_mfa is not null and requires_mfa not in ('true', 'false') then
        -- Log suspicious configuration value
        raise warning 'Invalid requires_mfa configuration value: %', requires_mfa;
        -- Default to requiring MFA for security
        requires_mfa := 'true';
    end if;

    -- Handle MFA check based on configuration
    if requires_mfa = 'true' then
        -- MFA is required, check if user has aal2 access
        select supamode.is_aal2() into has_mfa;
    else
        -- MFA is not required or not configured, allow access
        has_mfa := true;
    end if;

    -- Return true only if user has admin access AND meets MFA requirements
    return coalesce(has_admin_access, false) and coalesce(has_mfa, false);
end
$$ language plpgsql;

grant
execute on function supamode.verify_admin_access () to authenticated;