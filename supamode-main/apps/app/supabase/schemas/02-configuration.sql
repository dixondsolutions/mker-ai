
/**
 * SECTION: CONFIGURATION
 */
create table if not exists supamode.configuration (
  key VARCHAR(100) primary key,
  value TEXT not null,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW()
);

alter table supamode.configuration enable row level security;

-- Grant access to the configuration table
grant
select
,
  insert,
update,
delete on supamode.configuration to authenticated,
service_role;

-- SECTION: GET CONFIGURATION VALUE
-- This function retrieves a configuration value by its key.
create or replace function supamode.get_configuration_value (p_key VARCHAR(100)) returns TEXT
set
  search_path = '' as $$
declare
    v_value TEXT;
begin
    -- Validate key format to prevent injection
    if p_key !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' then
        raise exception 'Invalid configuration key format';
    end if;

    select value
    into v_value
    from supamode.configuration
    where key = p_key;

    return v_value;
end;
$$ language plpgsql;

grant
execute on function supamode.get_configuration_value (VARCHAR(100)) to authenticated,
service_role;