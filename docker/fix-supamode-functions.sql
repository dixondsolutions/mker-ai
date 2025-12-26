-- Create is_aal2 function
create or replace function supamode.is_aal2 () returns boolean
set search_path = '' as $$
declare
    is_aal2 boolean;
begin
    select auth.jwt() ->> 'aal' = 'aal2' into is_aal2;
    return coalesce(is_aal2, false);
end
$$ language plpgsql;

grant execute on function supamode.is_aal2 () to authenticated;

-- Create is_mfa_compliant function
create or replace function supamode.is_mfa_compliant () returns boolean
set row_security = off
set search_path = '' as $$
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

grant execute on function supamode.is_mfa_compliant () to authenticated;

-- Create get_configuration_value function
create or replace function supamode.get_configuration_value (p_key VARCHAR(100)) returns TEXT
set search_path = '' as $$
declare
    v_value TEXT;
begin
    if p_key !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' then
        raise exception 'Invalid configuration key format';
    end if;
    select value into v_value from supamode.configuration where key = p_key;
    return v_value;
end;
$$ language plpgsql;

grant execute on function supamode.get_configuration_value (VARCHAR(100)) to authenticated, service_role;

-- Create verify_admin_access function
create or replace function supamode.verify_admin_access () RETURNS boolean
set search_path = '' as $$
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
        raise warning 'Invalid requires_mfa configuration value: %', requires_mfa;
        requires_mfa := 'true';
    end if;

    -- Handle MFA check based on configuration
    if requires_mfa = 'true' then
        select supamode.is_aal2() into has_mfa;
    else
        has_mfa := true;
    end if;

    -- Return true only if user has admin access AND meets MFA requirements
    return coalesce(has_admin_access, false) and coalesce(has_mfa, false);
end
$$ language plpgsql;

grant execute on function supamode.verify_admin_access () to authenticated;

-- Set MFA to not required for this deployment
INSERT INTO supamode.configuration (key, value) VALUES ('requires_mfa', 'false')
ON CONFLICT (key) DO UPDATE SET value = 'false';

