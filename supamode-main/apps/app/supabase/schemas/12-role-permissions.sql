
-- Role-permission assignments
create table if not exists supamode.role_permissions (
  role_id UUID not null references supamode.roles (id) on delete CASCADE,
  permission_id UUID not null references supamode.permissions (id) on delete CASCADE,
  granted_at TIMESTAMPTZ not null default NOW(),
  granted_by UUID references supamode.accounts (id),
  valid_from TIMESTAMPTZ default NOW(),
  valid_until TIMESTAMPTZ,
  conditions JSONB default null,
  metadata JSONB default '{}'::jsonb,
  primary key (role_id, permission_id),
  -- Ensure valid_from is before valid_until
  constraint valid_time_range check (
    valid_from is null
    or valid_until is null
    or valid_from < valid_until
  )
);

comment on table supamode.role_permissions is 'Table to store the role permissions';

comment on column supamode.role_permissions.role_id is 'The ID of the role';

comment on column supamode.role_permissions.permission_id is 'The ID of the permission';

comment on column supamode.role_permissions.granted_at is 'The time the permission was granted';

comment on column supamode.role_permissions.granted_by is 'The user who granted the permission';

comment on column supamode.role_permissions.valid_from is 'The time the permission is valid from';

comment on column supamode.role_permissions.valid_until is 'The time the permission is valid until';

comment on column supamode.role_permissions.conditions is 'The conditions of the permission';

comment on column supamode.role_permissions.metadata is 'The metadata of the permission';

-- Grant access to the role_permissions table
grant
select
,
  insert,
update,
delete on table supamode.role_permissions to authenticated,
service_role;

-- RLS
alter table supamode.role_permissions ENABLE row LEVEL SECURITY;

-- Indexes
create index idx_role_permissions_role_id on supamode.role_permissions (role_id);

create index idx_role_permissions_permission_id on supamode.role_permissions (permission_id);