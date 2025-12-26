
-- SECTION: ACCOUNT PERMISSIONS
-- In this section, we define the account permissions table and the functions to check if a user has permission for a specific resource.
--
-- This function is used to check if a user has permission for a specific permission. It can be reused for both system and data permissions.
create table supamode.account_permissions (
  account_id UUID not null references supamode.accounts (id) on delete CASCADE,
  permission_id UUID not null references supamode.permissions (id) on delete CASCADE,
  is_grant BOOLEAN not null, -- TRUE = explicitly grant, FALSE = explicitly deny
  granted_at TIMESTAMPTZ not null default NOW(),
  granted_by UUID references supamode.accounts (id),
  valid_from TIMESTAMPTZ default NOW(),
  valid_until TIMESTAMPTZ,
  metadata JSONB default '{}'::jsonb,
  primary key (account_id, permission_id),
  -- Ensure valid_from is before valid_until
  constraint valid_time_range check (
    valid_from is null
    or valid_until is null
    or valid_from < valid_until
  )
);

comment on table supamode.account_permissions is 'Table to store the account permissions';

comment on column supamode.account_permissions.account_id is 'The ID of the account';

comment on column supamode.account_permissions.permission_id is 'The ID of the permission';

comment on column supamode.account_permissions.is_grant is 'Whether the permission is granted';

comment on column supamode.account_permissions.granted_at is 'The time the permission was granted';

comment on column supamode.account_permissions.granted_by is 'The user who granted the permission';

comment on column supamode.account_permissions.valid_from is 'The time the permission is valid from';

comment on column supamode.account_permissions.valid_until is 'The time the permission is valid until';

comment on column supamode.account_permissions.metadata is 'The metadata of the permission';

-- Grant access to the account_permissions table
grant
select
,
  insert,
update,
delete on table supamode.account_permissions to authenticated,
service_role;

-- RLS
alter table supamode.account_permissions ENABLE row LEVEL SECURITY;