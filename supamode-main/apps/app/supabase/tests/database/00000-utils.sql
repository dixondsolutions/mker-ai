create schema if not exists kit;

-- anon, authenticated, and service_role should have access to kit schema
grant USAGE on schema kit to anon, authenticated, service_role;

-- Don't allow public to execute any functions in the kit schema
alter default PRIVILEGES in schema kit revoke execute on FUNCTIONS from public;

-- Grant execute to anon, authenticated, and service_role for testing purposes
alter default PRIVILEGES in schema kit grant execute on FUNCTIONS to anon,
    authenticated, service_role;

-- Helper function to create deterministic UUIDs for testing
CREATE OR REPLACE FUNCTION kit.test_uuid(suffix int) RETURNS uuid AS $$
BEGIN
    RETURN ('00000000-0000-0000-0000-' || lpad(suffix::text, 12, '0'))::uuid;
END;
$$ LANGUAGE plpgsql;

-- Override the create_supabase_user function to use a deterministic UUID
CREATE OR REPLACE FUNCTION kit.create_supabase_user(user_id uuid, identifier text, email text default null, phone text default null, metadata jsonb default null)
RETURNS uuid
    SECURITY DEFINER
    SET search_path = auth, pg_temp
AS $$
BEGIN
    -- create the user
    INSERT INTO auth.users (id, email, phone, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    VALUES (user_id, coalesce(email, concat(user_id, '@test.com')), phone, jsonb_build_object('test_identifier', identifier), '{"supamode_access": "true"}'::jsonb, now(), now())
    RETURNING id INTO user_id;

    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

create or replace function kit.set_admin_access(
    p_email text,
    p_admin_access text
)

    returns void
    security definer
as
$$
begin
    update auth.users
    set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('supamode_access', p_admin_access)
    where email = p_email;

    perform kit.set_session_admin_access(p_admin_access);
end;
$$ language PLPGSQL;

create or replace function kit.get_id_by_identifier(
    identifier text
)
    returns uuid
as $$
begin

    return (select id from auth.users where raw_user_meta_data->>'test_identifier' = identifier);

end;

$$ language PLPGSQL;

create or replace function kit.set_identifier(
    identifier text,
    user_email text
)
    returns text
    security definer
    set search_path = auth, pg_temp
as
$$
begin
    update auth.users
    set raw_user_meta_data = jsonb_build_object('test_identifier', identifier)
    where email = user_email;

    return identifier;

end;

$$ language PLPGSQL;

create or replace function kit.authenticate_as(
    identifier text
) returns void
as
$$
begin
    perform tests.authenticate_as(identifier);
    perform kit.set_session_aal('aal1');
    perform kit.set_session_admin_access('true');
end;
$$ language plpgsql;

create or replace function kit.set_mfa_factor(
    identifier text = gen_random_uuid()
)
    returns void
as
$$
begin
    insert into "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret")
    values (gen_random_uuid(), auth.uid(), identifier, 'totp', 'verified', '2025-02-24 09:48:18.402031+00', '2025-02-24 09:48:18.402031+00',
            'HOWQFBA7KBDDRSBNMGFYZAFNPRSZ62I5');
end;
$$ language plpgsql security definer;

create or replace function kit.set_session_aal(session_aal auth.aal_level)
    returns void
as
$$
begin
    perform set_config('request.jwt.claims', json_build_object(
            'sub', current_setting('request.jwt.claims')::json ->> 'sub',
            'email', current_setting('request.jwt.claims')::json ->> 'email',
            'phone', current_setting('request.jwt.claims')::json ->> 'phone',
            'user_metadata', current_setting('request.jwt.claims')::json ->> 'user_metadata',
            'app_metadata', current_setting('request.jwt.claims')::json ->> 'app_metadata',
            'aal', session_aal)::text, true);
end;
$$ language plpgsql;

create or replace function kit.set_session_admin_access(admin_access text)
    returns void
as
$$
begin
    perform set_config('request.jwt.claims', json_build_object(
            'sub', current_setting('request.jwt.claims')::json ->> 'sub',
            'email', current_setting('request.jwt.claims')::json ->> 'email',
            'phone', current_setting('request.jwt.claims')::json ->> 'phone',
            'user_metadata', current_setting('request.jwt.claims')::json ->> 'user_metadata',
            'app_metadata', jsonb_build_object('supamode_access', admin_access),
            'aal', current_setting('request.jwt.claims')::json ->> 'aal')::text, true);
end;
$$ language plpgsql;

create or replace function kit.set_super_admin() returns void
as
$$
begin
    perform set_config('request.jwt.claims', json_build_object(
            'sub', current_setting('request.jwt.claims')::json ->> 'sub',
            'email', current_setting('request.jwt.claims')::json ->> 'email',
            'phone', current_setting('request.jwt.claims')::json ->> 'phone',
            'user_metadata', current_setting('request.jwt.claims')::json ->> 'user_metadata',
            'app_metadata', json_build_object('supamode_access', 'true'),
            'aal', current_setting('request.jwt.claims')::json ->> 'aal'
                                             )::text, true);
end;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION kit.nowish()
      RETURNS timestamp with time zone
      AS
      $$
      BEGIN
      RETURN timeofday()::timestamptz + interval '0.1 second';
      END;
      $$
      LANGUAGE plpgsql STABLE PARALLEL SAFE STRICT;

begin;

select plan(1);

select has_column(
    'auth',
    'users',
    'id',
    'id should exist'
);

select *
from
    finish();
