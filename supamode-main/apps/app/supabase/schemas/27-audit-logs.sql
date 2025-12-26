
-- SECTION: AUDIT LOG TABLE
-- In this section, we define the audit log table. This table is used to store the audit logs.
create table if not exists supamode.audit_logs (
  id UUID primary key default gen_random_uuid (),
  created_at TIMESTAMPTZ not null default now(),
  account_id UUID references supamode.accounts (id) on delete set null,
  user_id UUID references auth.users (id) on delete set null default auth.uid (),
  operation TEXT not null,
  schema_name TEXT not null,
  table_name TEXT not null,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  severity supamode.audit_log_severity not null,
  metadata JSONB
);

comment on table supamode.audit_logs is 'Table to store the audit logs';

comment on column supamode.audit_logs.id is 'The ID of the audit log';

comment on column supamode.audit_logs.created_at is 'The timestamp of the audit log';

comment on column supamode.audit_logs.account_id is 'The ID of the account';

comment on column supamode.audit_logs.user_id is 'The ID of the user';

comment on column supamode.audit_logs.operation is 'The operation of the audit log';

comment on column supamode.audit_logs.schema_name is 'The schema of the audit log';

comment on column supamode.audit_logs.table_name is 'The table of the audit log';

comment on column supamode.audit_logs.record_id is 'The ID of the record';

comment on column supamode.audit_logs.old_data is 'The old data of the audit log';

comment on column supamode.audit_logs.new_data is 'The new data of the audit log';

comment on column supamode.audit_logs.severity is 'The severity of the audit log';

comment on column supamode.audit_logs.metadata is 'The metadata of the audit log';

-- Grants
grant
select
,
  INSERT on supamode.audit_logs to authenticated;

grant
select
  on supamode.audit_logs to service_role;

-- Enable RLS for the audit log table
alter table supamode.audit_logs ENABLE row LEVEL SECURITY;

-- Indexes
create index idx_audit_logs_created_at on supamode.audit_logs (created_at);

create index idx_audit_logs_account_id on supamode.audit_logs (account_id);

create index idx_audit_logs_operation on supamode.audit_logs (operation);

create index idx_audit_logs_schema_table on supamode.audit_logs (schema_name, table_name);


-- SECTION: CREATE AUDIT LOG
-- In this section, we define the create audit log function. This function is used to create an audit log.
create or replace function supamode.create_audit_log (
  p_operation TEXT,
  p_schema TEXT,
  p_table TEXT,
  p_record_id TEXT,
  p_old_data JSONB,
  p_new_data JSONB,
  p_severity supamode.audit_log_severity default 'info',
  p_metadata JSONB default '{}'::jsonb
) RETURNS UUID
set
  search_path = '' as $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Insert log entry
    INSERT INTO supamode.audit_logs (account_id,
                                     operation,
                                     schema_name,
                                     table_name,
                                     record_id,
                                     old_data,
                                     new_data,
                                     severity,
                                     metadata)
    VALUES (supamode.get_current_user_account_id(),
            p_operation,
            p_schema,
            p_table,
            p_record_id,
            p_old_data,
            p_new_data,
            p_severity,
            p_metadata)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- SECTION: CAN READ AUDIT LOG
-- In this section, we define the can read audit log function. This function is used to check if the user can read the audit log.
create or replace function supamode.can_read_audit_log (p_target_account_id uuid) returns boolean
set
  search_path = '' as $$
declare
    v_can_read_logs                 boolean;
    v_current_account_role_rank int;
    v_target_account_role_rank  int;
begin
    -- the user is an admin
    if not supamode.verify_admin_access() then
        return false;
    end if;

    -- The user first must have a permission to read the audit log
    select supamode.has_admin_permission('log'::supamode.system_resource, 'select'::supamode.system_action)
    into v_can_read_logs;

    if not v_can_read_logs then
        return false;
    end if;

    -- The user is the owner of the audit log
    if p_target_account_id = supamode.get_current_user_account_id() then
        return true;
    end if;

    -- Get the current account's role rank
    select rank
    into v_current_account_role_rank
    from supamode.roles
             join supamode.account_roles on supamode.roles.id = supamode.account_roles.role_id
    where supamode.account_roles.account_id = supamode.get_current_user_account_id();

    -- Get the target account's role rank
    select rank
    into v_target_account_role_rank
    from supamode.roles
             join supamode.account_roles on supamode.roles.id = supamode.account_roles.role_id
    where supamode.account_roles.account_id = p_target_account_id;

    -- The user's role rank is less than the target account's role rank
    -- so the user cannot read the audit log of the target account because their role is not high enough
    if (v_target_account_role_rank > v_current_account_role_rank) then
        return false;
    end if;

    return true;
end;
$$ language plpgsql;

grant
execute on function supamode.can_read_audit_log to authenticated;


-- SELECT(supamode.audit_logs)
create policy select_supamode_audit_logs on supamode.audit_logs for
select
  using (supamode.can_read_audit_log (account_id));

-- INSERT(supamode.audit_logs)
-- Only the owner of the audit log can insert into the audit log table
create policy insert_supamode_audit_logs on supamode.audit_logs for INSERT
with
  check (
    -- The user is the owner of the audit log
    account_id = supamode.get_current_user_account_id ()
  );
