
-- Section MFA Restrictions
-- MFA Restrictions:
-- the following policies are applied to the tables as a
-- restrictive policy to ensure that if MFA is enabled, then the policy will be applied.
-- For users that have not enabled MFA, the policy will not be applied and will keep the default behavior.
-- Restrict access to configuration if MFA is enabled
create policy restrict_mfa_configuration on supamode.configuration as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to accounts if MFA is enabled
create policy restrict_mfa_accounts on supamode.accounts as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to permissions
create policy restrict_mfa_permissions on supamode.permissions as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to roles if MFA is enabled
create policy restrict_mfa_roles on supamode.roles as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to account_permissions if MFA is enabled
create policy restrict_mfa_account_permissions on supamode.account_permissions as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to account_roles if MFA is enabled
create policy restrict_mfa_account_roles on supamode.account_roles as restrictive to authenticated using (supamode.is_mfa_compliant ());

create policy restrict_mfa_role_permissions on supamode.role_permissions as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to permission groups if MFA is enabled
create policy restrict_mfa_permission_groups on supamode.permission_groups as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to permission groups permissions if MFA is enabled
create policy restrict_mfa_permission_groups_permissions on supamode.permission_group_permissions as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to role_permission_groups if MFA is enabled
create policy restrict_mfa_role_permission_groups on supamode.role_permission_groups as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to table metadata if MFA is enabled
create policy restrict_mfa_table_metadata on supamode.table_metadata as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to saved views if MFA is enabled
create policy restrict_mfa_saved_views on supamode.saved_views as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to saved view roles if MFA is enabled
create policy restrict_mfa_saved_view_roles on supamode.saved_view_roles as restrictive to authenticated using (supamode.is_mfa_compliant ());

-- Restrict access to audit logs if MFA is enabled
create policy restrict_mfa_audit_logs on supamode.audit_logs as restrictive to authenticated using (supamode.is_mfa_compliant ());