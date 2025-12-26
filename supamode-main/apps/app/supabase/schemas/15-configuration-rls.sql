
-- SECTION: CONFIGURATION RLS POLICIES
-- READ(supamode.configuration)
create policy read_configuration_value on supamode.configuration for
select
  to authenticated using (supamode.account_has_admin_access ());

-- UPDATE(supamode.configuration)
create policy update_configuration_value on supamode.configuration
for update
  to authenticated using (
    supamode.has_admin_permission (
      'system_setting'::supamode.system_resource,
      'update'::supamode.system_action
    )
  )
with
  check (
    supamode.has_admin_permission (
      'system_setting'::supamode.system_resource,
      'update'::supamode.system_action
    )
  );

-- DELETE(supamode.configuration)
create policy delete_configuration_value on supamode.configuration for delete to authenticated using (
  supamode.has_admin_permission (
    'system_setting'::supamode.system_resource,
    'delete'::supamode.system_action
  )
);

-- INSERT(supamode.configuration)
create policy insert_configuration_value on supamode.configuration for insert to authenticated
with
  check (
    supamode.has_admin_permission (
      'system_setting'::supamode.system_resource,
      'insert'::supamode.system_action
    )
  );