
-- SECTION: ACCOUNT PERMISSIONS POLICIES
-- In this section, we define the account permissions policies. The account permissions policies are used to control the access to the account permissions table.
-- SELECT(supamode.account_permissions)
-- Can the current user view an account permission?
create policy view_account_permissions on supamode.account_permissions for
select
  to authenticated using (
    -- Users can see their own permissions
    account_id = supamode.get_current_user_account_id ()
    -- Users with permission management rights can see permissions of users with lower rank
    or (
      supamode.has_admin_permission (
        'permission'::supamode.system_resource,
        'select'::supamode.system_action
      )
      and supamode.get_user_max_role_rank (supamode.get_current_user_account_id ()) > supamode.get_user_max_role_rank (account_id)
    )
  );

-- SELECT(supamode.role_permissions)
-- Can the current user view a role permission?
create policy view_role_permissions on supamode.role_permissions for
select
  to AUTHENTICATED using (
    -- Users can view role permissions if they have the role assigned to them
    exists (
      select
        1
      from
        supamode.account_roles ar
      where
        ar.account_id = supamode.get_current_user_account_id ()
        and ar.role_id = role_id
    )
  );

-- INSERT(supamode.role_permissions)
-- Can the current user insert a role permission?
create policy insert_role_permissions on supamode.role_permissions for INSERT to authenticated
with
  check (
    supamode.can_action_role (role_id, 'insert'::supamode.system_action)
    and supamode.has_admin_permission (
      'permission'::supamode.system_resource,
      'insert'::supamode.system_action
    )
  );

-- UPDATE(supamode.role_permissions)
-- Can the current user update a role permission?
create policy update_role_permissions on supamode.role_permissions
for update
  to authenticated using (
    supamode.can_action_role (role_id, 'update')
    and supamode.has_admin_permission ('permission'::supamode.system_resource, 'update')
  );

-- DELETE(supamode.role_permissions)
-- Can the current user delete a role permission?
create policy delete_role_permissions on supamode.role_permissions for DELETE to authenticated using (
  supamode.can_action_role (role_id, 'delete')
  and supamode.has_admin_permission ('permission'::supamode.system_resource, 'delete')
);

-- SELECT(supamode.permissions)
-- Can the current user view a permission?
create policy view_permissions on supamode.permissions for
select
  to authenticated using (
    -- Any authenticated user with admin access can view the permissions table
    supamode.verify_admin_access ()
  );

-- INSERT(supamode.permissions)
-- Can the current user insert a permission?
create policy insert_permissions on supamode.permissions for insert to authenticated
with
  check (
    supamode.has_admin_permission (
      'permission'::supamode.system_resource,
      'insert'::supamode.system_action
    )
  );

-- UPDATE(supamode.permissions)
-- Can the current user update a permission?
create policy update_permissions on supamode.permissions
for update
  to authenticated using (
    supamode.has_admin_permission (
      'permission'::supamode.system_resource,
      'update'::supamode.system_action
    )
  )
with
  check (
    supamode.has_admin_permission (
      'permission'::supamode.system_resource,
      'update'::supamode.system_action
    )
  );

-- DELETE(supamode.permissions)
-- Can the current user delete a permission?
create policy delete_permissions on supamode.permissions for DELETE to authenticated using (
  supamode.has_admin_permission (
    'permission'::supamode.system_resource,
    'delete'::supamode.system_action
  )
);

-- INSERT(supamode.account_permissions)
-- Can the current user insert an account permission?
create policy insert_account_permissions on supamode.account_permissions for INSERT to authenticated
with
  check (
    supamode.has_admin_permission (
      'permission'::supamode.system_resource,
      'insert'::supamode.system_action
    )
    and supamode.get_user_max_role_rank (supamode.get_current_user_account_id ()) > supamode.get_user_max_role_rank (account_id)
  );

-- UPDATE(supamode.account_permissions)
-- Can the current user update an account permission?
create policy update_account_permissions on supamode.account_permissions
for update
  to authenticated using (
    supamode.has_admin_permission (
      'permission'::supamode.system_resource,
      'update'::supamode.system_action
    )
    and supamode.get_user_max_role_rank (supamode.get_current_user_account_id ()) > supamode.get_user_max_role_rank (account_id)
  );

-- DELETE(supamode.account_permissions)
-- Can the current user delete an account permission?
create policy delete_account_permissions on supamode.account_permissions for DELETE to authenticated using (
  supamode.has_admin_permission (
    'permission'::supamode.system_resource,
    'delete'::supamode.system_action
  )
  and supamode.get_user_max_role_rank (supamode.get_current_user_account_id ()) > supamode.get_user_max_role_rank (account_id)
);

-- SECTION: PERMISSION GROUP PERMISSIONS POLICIES
-- In this section, we define the permission group permissions policies. The permission group permissions policies are used to control the access to the permission group permissions table.
-- SELECT(supamode.permission_group_permissions)
-- Can the current user view a permission group permission?
create policy view_permission_group_permissions on supamode.permission_group_permissions for
select
  to authenticated using (
    supamode.can_view_permission_group (supamode.get_current_user_account_id (), group_id)
  );

-- INSERT(supamode.permission_group_permissions)
-- Can the current user insert a permission group permission?
create policy insert_permission_group_permissions on supamode.permission_group_permissions for INSERT to authenticated
with
  check (
    supamode.can_modify_permission_group_permissions (group_id, 'insert'::supamode.system_action)
  );

-- UPDATE(supamode.permission_group_permissions)
-- Can the current user update a permission group permission?
create policy update_permission_group_permissions on supamode.permission_group_permissions
for update
  to authenticated using (
    supamode.can_modify_permission_group_permissions (group_id, 'update'::supamode.system_action)
  );

-- DELETE(supamode.permission_group_permissions)
-- Can the current user delete a permission group permission?
create policy delete_permission_group_permissions on supamode.permission_group_permissions for DELETE to authenticated using (
  supamode.can_modify_permission_group_permissions (group_id, 'delete'::supamode.system_action)
);

-- SELECT(supamode.roles)
-- Can the current user view a role?
create policy view_roles on supamode.roles for
select
  to authenticated using (
    -- Any authenticated user with admin access can view the roles table
    supamode.verify_admin_access ()
  );

-- UPDATE(supamode.roles)
-- Can the current user update a role?
create policy update_roles on supamode.roles
for update
  to authenticated using (supamode.can_action_role (id, 'update'))
with
  check (supamode.can_action_role (id, 'update'));

-- DELETE(supamode.roles)
-- Can the current user delete a role?
create policy delete_roles on supamode.roles for DELETE to authenticated using (supamode.can_delete_role (id));

-- INSERT(supamode.roles)
-- Can the current user insert a role?
create policy insert_roles on supamode.roles for INSERT to authenticated
with
  check (
    -- The user must have the insert role permission AND
    supamode.has_admin_permission (
      'role'::supamode.system_resource,
      'insert'::supamode.system_action
    )
    and
    -- The role rank must be less than the user's maximum role rank
    rank < supamode.get_user_max_role_rank (supamode.get_current_user_account_id ())
  );


-- SELECT(supamode.account_roles)
-- Can the current user view an account role?
create policy view_account_roles on supamode.account_roles for
select
  to authenticated using
  -- Any authenticated user with admin access can view the role assigned to a user
  (supamode.verify_admin_access ());

-- INSERT(supamode.account_roles)
-- Can the current user insert an account role?
create policy insert_account_roles on supamode.account_roles for INSERT to authenticated
with
  check (
    -- We verify if the user can modify the account role
    supamode.can_modify_account_role (
      supamode.get_current_user_account_id (),
      account_id,
      role_id,
      'insert'::supamode.system_action
    )
  );

-- UPDATE(supamode.account_roles)
-- Can the current user update an account role?
create policy update_account_roles on supamode.account_roles
for update
  to authenticated using (
    supamode.can_modify_account_role (
      supamode.get_current_user_account_id (),
      account_id,
      role_id,
      'update'::supamode.system_action
    )
  )
with
  check (
    supamode.can_modify_account_role (
      supamode.get_current_user_account_id (),
      account_id,
      role_id,
      'update'::supamode.system_action
    )
  );

-- DELETE(supamode.account_roles)
-- Can the current user delete an account role?
create policy delete_account_roles on supamode.account_roles for DELETE to authenticated using (
  supamode.can_modify_account_role (
    supamode.get_current_user_account_id (),
    account_id,
    role_id,
    'delete'::supamode.system_action
  )
);

-- SELECT(supamode.permission_groups)
-- Can the current user view a permission group?
create policy view_permissions_groups on supamode.permission_groups for
select
  using (
    supamode.can_view_permission_group (supamode.get_current_user_account_id (), id)
  );

-- UPDATE(supamode.permission_groups)
-- Can the current user update a permission group?
create policy update_permissions_groups on supamode.permission_groups
for update
  to authenticated using (
    supamode.can_modify_permission_group (id, 'update'::supamode.system_action)
  );

-- DELETE(supamode.permission_groups)
-- Can the current user delete a permission group?
create policy delete_permissions_groups on supamode.permission_groups for DELETE to authenticated using (
  supamode.can_modify_permission_group (id, 'delete'::supamode.system_action)
);

-- INSERT(supamode.permission_groups)
-- Can the current user insert a permission group?
create policy insert_permission_groups on supamode.permission_groups for insert to authenticated
with
  check (
    supamode.has_admin_permission (
      'permission'::supamode.system_resource,
      'insert'::supamode.system_action
    )
  );

-- SELECT(supamode.role_permission_groups)
-- Can the current user view a role permission group?
create policy view_role_permission_groups on supamode.role_permission_groups for
select
  to authenticated using (
    supamode.can_view_role_permission_group (supamode.get_current_user_account_id (), role_id)
  );

-- INSERT(supamode.role_permission_groups)
-- Can the current user insert a role permission group?
create policy insert_role_permission_groups on supamode.role_permission_groups for insert to authenticated
with
  check (
    supamode.can_modify_role_permission_group (
      supamode.get_current_user_account_id (),
      role_id,
      'insert'::supamode.system_action
    )
  );

-- UPDATE(supamode.role_permission_groups)
-- Can the current user update a role permission group?
create policy update_role_permission_groups on supamode.role_permission_groups
for update
  to authenticated using (
    supamode.can_modify_role_permission_group (
      supamode.get_current_user_account_id (),
      role_id,
      'update'::supamode.system_action
    )
  );

-- DELETE(supamode.role_permission_groups)
-- Can the current user delete a role permission group?
create policy delete_role_permission_groups on supamode.role_permission_groups for DELETE to authenticated using (
  supamode.can_modify_role_permission_group (
    supamode.get_current_user_account_id (),
    role_id,
    'delete'::supamode.system_action
  )
);
