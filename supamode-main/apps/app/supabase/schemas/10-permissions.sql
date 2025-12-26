
-- SECTION: PERMISSIONS
-- In this section, we define the permissions table and the functions to check if a user has permission for a specific resource.
--
create table if not exists supamode.permissions (
  id UUID primary key default gen_random_uuid (),
  name VARCHAR(100) not null unique,
  description varchar(500),
  permission_type supamode.permission_type not null, -- 'system' or 'data'
  -- For system permissions
  system_resource supamode.system_resource,
  -- For data permissions
  scope supamode.permission_scope,
  schema_name VARCHAR(64),
  table_name VARCHAR(64),
  column_name VARCHAR(64),
  action supamode.system_action not null,
  constraints JSONB default null,
  conditions JSONB default null,
  metadata JSONB default '{}'::jsonb,
  created_at TIMESTAMPTZ not null default NOW(),
  updated_at TIMESTAMPTZ not null default NOW(),
  -- Ensure appropriate fields are filled based on type
  constraint valid_permission_type check (
    (
      permission_type = 'system'
      and system_resource is not null
      and scope is null -- system permissions should not have a scope
      and schema_name is null -- system permissions should not have a schema_name
      and table_name is null -- system permissions should not have a table_name
      and column_name is null -- system permissions should not have a column_name
    )
    or (
      permission_type = 'data'
      and scope is not null
      and (
        (
          scope = 'table'
          and schema_name is not null
          and table_name is not null
          and column_name is null
        )
        or (
          scope = 'column'
          and schema_name is not null
          and table_name is not null
          and column_name is not null
        )
      )
    )
    or (
      scope = 'storage'
      and metadata ->> 'bucket_name' is not null
      and metadata ->> 'path_pattern' is not null
    )
  ),
  -- Ensure name is unique
  constraint permissions_name_unique unique (name),
  -- Ensure schema_name is valid when scope is table or column
  constraint permissions_schema_name_check check (
    scope = 'storage'
    or schema_name ~ '^[a-zA-Z_][a-zA-Z0-9_]*$'
    or schema_name = '*'
  ),
  -- Ensure column_name is valid when scope is table or column
  constraint permissions_column_name_check check (
    scope = 'storage'
    or column_name ~ '^[a-zA-Z_][a-zA-Z0-9_]*$'
    or column_name = '*'
  )
);

comment on table supamode.permissions is 'Table to store the permissions';

comment on column supamode.permissions.id is 'The ID of the permission';

comment on column supamode.permissions.name is 'The name of the permission';

comment on column supamode.permissions.description is 'The description of the permission';

comment on column supamode.permissions.permission_type is 'The type of the permission';

comment on column supamode.permissions.system_resource is 'The system resource of the permission';

comment on column supamode.permissions.scope is 'The scope of the permission';

comment on column supamode.permissions.schema_name is 'The schema name of the permission';

comment on column supamode.permissions.table_name is 'The table name of the permission';

comment on column supamode.permissions.column_name is 'The column name of the permission';

comment on column supamode.permissions.action is 'The action of the permission';

comment on column supamode.permissions.constraints is 'The constraints of the permission';

comment on column supamode.permissions.conditions is 'The conditions of the permission';

comment on column supamode.permissions.metadata is 'The metadata of the permission';

comment on column supamode.permissions.created_at is 'The creation time of the permission';

comment on column supamode.permissions.updated_at is 'The last update time of the permission';

-- Grant access to the permissions table
grant
select
,
  insert,
update,
delete on table supamode.permissions to authenticated,
service_role;

-- Indexes
create index idx_permissions_type_resource on supamode.permissions (permission_type, system_resource);

create index idx_permissions_scope_schema_table on supamode.permissions (scope, schema_name, table_name);

-- RLS
alter table supamode.permissions ENABLE row LEVEL SECURITY;