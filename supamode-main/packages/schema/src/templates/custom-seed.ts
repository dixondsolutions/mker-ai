import {
  Account,
  Permission,
  PermissionGroup,
  Role,
  SupamodeSeedGenerator,
} from '../generator';

const app = new SupamodeSeedGenerator();

export default function (options: { rootAccountId: string | undefined }) {
  // Create permissions with function parameters
  const rootAccount = Account.create({
    app,
    id: options.rootAccountId ?? '202141c3-2dcd-4417-a01b-f8d7935f1c0c',
    config: {
      metadata: {
        display_name: 'Root',
        email: 'root@example.com',
      },
    },
  });

  const adminAccount = Account.create({
    app,
    id: '91659851-467b-4eb0-8120-21b55f24c241',
    config: {
      metadata: {
        display_name: 'Admin',
        email: 'admin@example.com',
      },
    },
  });

  const memberAccount = Account.create({
    app,
    id: '4f898e68-bff2-4c31-b279-ed1e79479ea7',
    config: {
      metadata: {
        display_name: 'Member',
        email: 'member@example.com',
      },
    },
  });

  const readonlyAccount = Account.create({
    app,
    id: 'e536826e-54ed-4b12-bb79-2803f5de082f',
    config: {
      metadata: {
        display_name: 'Readonly',
        email: 'readonly@example.com',
      },
    },
  });

  // Create roles with object parameters
  const rootRole = Role.create({
    app,
    id: 'root_role',
    config: {
      name: 'Root',
      description: 'Full system access',
      rank: 100,
    },
  });

  // Create roles with object parameters
  const adminRole = Role.create({
    app,
    id: 'admin_role',
    config: {
      name: 'Administrator',
      description: 'Broad system access',
      rank: 90,
    },
  });

  // Create a Member role with some data write access
  const memberRole = Role.create({
    app,
    id: 'member_role',
    config: {
      name: 'Member',
      description: 'Limited access to system data',
      rank: 50,
    },
  });

  // Create a Readonly role with no data write access
  const readonlyRole = Role.create({
    app,
    id: 'readonly_role',
    config: {
      name: 'Readonly',
      description: 'Can only view data',
      rank: 40,
    },
  });

  // create an Administrator Permission Group
  const administratorManagementGroup = PermissionGroup.create({
    app,
    id: 'administrator',
    config: {
      name: 'Administrator',
      description: 'Broad Permissions',
    },
  });

  const updateSystemDataRole = Permission.create({
    app,
    id: 'update_system_data',
    config: {
      name: 'Update System Data',
      description: 'Can update all managed tables',
      system_resource: 'table',
      action: 'update',
      permission_type: 'system',
    },
  });

  const managePermissions = Permission.create({
    app,
    id: 'manage_permission',
    config: {
      name: 'Manage Permission',
      description: 'Can manage permissions',
      system_resource: 'permission',
      action: '*',
      permission_type: 'system',
    },
  });

  const manageAccounts = Permission.create({
    app,
    id: 'manage_account',
    config: {
      name: 'Manage Account',
      description: 'Can manage accounts',
      system_resource: 'account',
      action: '*',
      permission_type: 'system',
    },
  });

  // grant read access to all tables
  const readAllTables = Permission.create({
    app,
    id: 'read_all_data',
    config: {
      name: 'Read All Data',
      description: 'Can view all data in the system',
      action: 'select',
      scope: 'table',
      schema_name: 'public',
      permission_type: 'data',
      table_name: '*',
    },
  });

  const manageAllAuthUsers = Permission.create({
    app,
    id: 'manage_all_auth_users',
    config: {
      name: 'Manage All Auth Users',
      description: 'Can manage all auth users in the system',
      permission_type: 'system',
      system_resource: 'auth_user',
      action: '*',
    },
  });

  const readAllAuthUsers = Permission.create({
    app,
    id: 'read_all_auth_users',
    config: {
      name: 'Read All Auth Users',
      description: 'Can read all auth users in the system',
      permission_type: 'system',
      system_resource: 'auth_user',
      action: 'select',
    },
  });

  // grant update access to all tables
  const updateAllTables = Permission.create({
    app,
    id: 'update_all_data',
    config: {
      name: 'Update All Data',
      description: 'Can update all data in the system',
      action: 'update',
      scope: 'table',
      schema_name: 'public',
      permission_type: 'data',
      table_name: '*',
    },
  });

  const manageRoles = Permission.create({
    app,
    id: 'manage_roles',
    config: {
      name: 'Manage Roles',
      description: 'Can manage all roles (insert, create, update, delete)',
      action: '*',
      system_resource: 'role',
      permission_type: 'system',
    },
  });

  // grant insert access to all tables
  const manageAllData = Permission.create({
    app,
    id: 'manage_all_data',
    config: {
      name: 'Manage All Data',
      description: 'Can manage all data in the system',
      action: '*',
      scope: 'table',
      schema_name: 'public',
      permission_type: 'data',
      table_name: '*',
    },
  });

  const updateAccounts = Permission.create({
    app,
    id: 'update_accounts',
    config: {
      name: 'Update Accounts',
      description: 'Can update all accounts in the system',
      action: 'update',
      scope: 'table',
      schema_name: 'public',
      table_name: 'accounts',
      permission_type: 'data',
    },
  });

  administratorManagementGroup.addPermissions([
    updateSystemDataRole,
    manageAccounts,
    readAllTables,
    updateAllTables,
    managePermissions,
    manageAllData,
    manageRoles,
    manageAllAuthUsers,
  ]);

  // Create a permission group
  const contentManagementGroup = PermissionGroup.create({
    app,
    id: 'content_management',
    config: {
      name: 'Content Management',
      description: 'Permissions for managing content',
    },
  });

  contentManagementGroup.addPermissions([
    readAllTables,
    updateAccounts,
    readAllAuthUsers,
  ]);

  // Create a readonly permission group
  const readonlyGroup = PermissionGroup.create({
    app,
    id: 'readonly',
    config: {
      name: 'Read Only',
      description: 'Read only access to all data',
    },
  });

  readonlyGroup.addPermissions([readAllTables, readAllAuthUsers]);

  // Add the permission group to the member role
  memberRole.addPermissionGroup({ group: contentManagementGroup });
  adminRole.addPermissionGroup({ group: administratorManagementGroup });
  rootRole.addPermissionGroup({ group: administratorManagementGroup });
  readonlyRole.addPermissionGroup({ group: readonlyGroup });

  // Assign roles to accounts
  rootAccount.assignRole(rootRole);
  adminAccount.assignRole(adminRole);
  memberAccount.assignRole(memberRole);
  readonlyAccount.assignRole(readonlyRole);

  return app;
}
