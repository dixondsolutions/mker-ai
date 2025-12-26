import {
  Account,
  Permission,
  PermissionGroup,
  Role,
  SupamodeSeedGenerator,
  SystemSetting,
} from '../generator';

const ROOT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

const app = new SupamodeSeedGenerator();

export default function (options: { rootAccountId: string | undefined }) {
  /**
   * COMPREHENSIVE SAAS SEED WITH ALL SYSTEM PERMISSIONS
   *
   * This seed creates all the necessary permissions for a complete SaaS admin system:
   * 1. SYSTEM PERMISSIONS (for all system resources)
   * 2. DATA PERMISSIONS (for database access)
   * 3. ROLES (with proper hierarchy)
   * 4. PERMISSION GROUPS (logical groupings)
   * 5. ACCOUNTS (test users)
   */

  // ========================================
  // SECTION 1: SYSTEM PERMISSIONS
  // ========================================

  // SYSTEM SETTINGS PERMISSIONS
  const manageSystemSettingsPermission = Permission.createSystemPermission({
    app,
    id: 'manage_system_settings',
    resource: 'system_setting',
    action: '*',
    name: 'Manage System Settings',
    description: 'Full CRUD access to manage system settings',
  });

  // ACCOUNT MANAGEMENT PERMISSIONS
  const manageAccountsPermission = Permission.createSystemPermission({
    app,
    id: 'manage_accounts',
    resource: 'account',
    action: '*',
    name: 'Manage Accounts',
    description: 'Full CRUD access to manage user accounts',
  });

  const readAccountsPermission = Permission.createSystemPermission({
    app,
    id: 'read_accounts',
    resource: 'account',
    action: 'select',
    name: 'Read Accounts',
    description: 'Read access to user accounts',
  });

  const updateAccountsPermission = Permission.createSystemPermission({
    app,
    id: 'update_accounts',
    resource: 'account',
    action: 'update',
    name: 'Update Accounts',
    description: 'Update user accounts',
  });

  const deleteAccountsPermission = Permission.createSystemPermission({
    app,
    id: 'delete_accounts',
    resource: 'account',
    action: 'delete',
    name: 'Delete Accounts',
    description: 'Delete user accounts',
  });

  // ROLE MANAGEMENT PERMISSIONS
  const manageRolesPermission = Permission.createSystemPermission({
    app,
    id: 'manage_roles',
    resource: 'role',
    action: '*',
    name: 'Manage Roles',
    description: 'Full CRUD access to manage roles',
  });

  const readRolesPermission = Permission.createSystemPermission({
    app,
    id: 'read_roles',
    resource: 'role',
    action: 'select',
    name: 'Read Roles',
    description: 'Read access to roles',
  });

  const updateRolesPermission = Permission.createSystemPermission({
    app,
    id: 'update_roles',
    resource: 'role',
    action: 'update',
    name: 'Update Roles',
    description: 'Update roles',
  });

  // PERMISSION MANAGEMENT PERMISSIONS
  const managePermissionsPermission = Permission.createSystemPermission({
    app,
    id: 'manage_permissions',
    resource: 'permission',
    action: '*',
    name: 'Manage Permissions',
    description: 'Full CRUD access to manage permissions',
  });

  const readPermissionsPermission = Permission.createSystemPermission({
    app,
    id: 'read_permissions',
    resource: 'permission',
    action: 'select',
    name: 'Read Permissions',
    description: 'Read access to permissions',
  });

  const updatePermissionsPermission = Permission.createSystemPermission({
    app,
    id: 'update_permissions',
    resource: 'permission',
    action: 'update',
    name: 'Update Permissions',
    description: 'Update permissions',
  });

  // TABLE MANAGEMENT PERMISSIONS
  const manageTablesPermission = Permission.createSystemPermission({
    app,
    id: 'manage_tables',
    resource: 'table',
    action: '*',
    name: 'Manage Tables',
    description: 'Full access to manage table metadata and configurations',
  });

  const readTablesPermission = Permission.createSystemPermission({
    app,
    id: 'read_tables',
    resource: 'table',
    action: 'select',
    name: 'Read Tables',
    description: 'Read access to table metadata',
  });

  const updateTablesPermission = Permission.createSystemPermission({
    app,
    id: 'update_tables',
    resource: 'table',
    action: 'update',
    name: 'Update Tables',
    description: 'Update table metadata and configurations',
  });

  // LOG MANAGEMENT PERMISSIONS
  const readLogsPermission = Permission.createSystemPermission({
    app,
    id: 'read_logs',
    resource: 'log',
    action: 'select',
    name: 'Read Logs',
    description: 'Read access to system logs',
  });

  // AUTH USER MANAGEMENT PERMISSIONS
  const manageAuthUsersPermission = Permission.createSystemPermission({
    app,
    id: 'manage_auth_users',
    resource: 'auth_user',
    action: '*',
    name: 'Manage Auth Users',
    description: 'Full access to manage Supabase auth users',
  });

  const readAuthUsersPermission = Permission.createSystemPermission({
    app,
    id: 'read_auth_users',
    resource: 'auth_user',
    action: 'select',
    name: 'Read System Auth Users',
    description: 'Read access to Supabase auth users',
  });

  const updateAuthUsersPermission = Permission.createSystemPermission({
    app,
    id: 'update_auth_users',
    resource: 'auth_user',
    action: 'update',
    name: 'Update Auth Users',
    description: 'Update Supabase auth users',
  });

  // STORAGE MANAGEMENT PERMISSIONS
  const manageAllStoragePermission = Permission.createDataPermission({
    app,
    id: 'manage_all_storage',
    scope: 'storage',
    action: '*',
    name: 'Manage All Storage',
    description: 'Full access to manage all storage',
    metadata: {
      bucket_name: '*',
      path_pattern: '*',
    },
  });

  // Read All Storage
  const readAllStoragePermission = Permission.createDataPermission({
    app,
    id: 'read_all_storage',
    scope: 'storage',
    action: 'select',
    name: 'Read All Storage',
    description: 'Read access to all storage',
    metadata: {
      bucket_name: '*',
      path_pattern: '*',
    },
  });

  // ========================================
  // SECTION 2: DATA PERMISSIONS
  // ========================================

  // TABLE-LEVEL PERMISSIONS (more granular)
  const manageAllTablesPermission = Permission.createDataPermission({
    app,
    id: 'manage_all_tables',
    name: 'Manage All Tables',
    description: 'Full CRUD access to all tables in public schema',
    scope: 'table',
    schema_name: 'public',
    table_name: '*',
    action: '*',
  });

  const readAllTablesPermission = Permission.createDataPermission({
    app,
    id: 'read_all_tables',
    name: 'Read All Tables',
    description: 'Read access to all tables in public schema',
    scope: 'table',
    schema_name: 'public',
    table_name: '*',
    action: 'select',
  });

  const readAuthTablesPermission = Permission.createDataPermission({
    app,
    id: 'read_auth_table',
    name: 'Read Auth Table',
    description: 'Read access to Supabase auth table',
    scope: 'table',
    schema_name: 'auth',
    table_name: 'users',
    action: 'select',
  });

  const updateAllTablesPermission = Permission.createDataPermission({
    app,
    id: 'update_all_tables',
    name: 'Update All Tables',
    description: 'Update access to all tables in public schema',
    scope: 'table',
    schema_name: 'public',
    table_name: '*',
    action: 'update',
  });

  const insertAllTablesPermission = Permission.createDataPermission({
    app,
    id: 'insert_all_tables',
    name: 'Insert All Tables',
    description: 'Insert access to all tables in public schema',
    scope: 'table',
    schema_name: 'public',
    table_name: '*',
    action: 'insert',
  });

  // ========================================
  // SECTION 3: PERMISSION GROUPS
  // ========================================

  // SUPER ADMIN GROUP (everything)
  const superAdminGroup = PermissionGroup.create({
    app,
    id: 'super_admin_group',
    config: {
      name: 'Super Admin',
      description: 'Full system access - all permissions',
    },
  });

  superAdminGroup.addPermissions([
    // System permissions
    manageAccountsPermission,
    manageAllTablesPermission,
    deleteAccountsPermission,
    manageRolesPermission,
    managePermissionsPermission,
    manageTablesPermission,
    readLogsPermission,
    manageAuthUsersPermission,
    manageSystemSettingsPermission,
    manageAllStoragePermission,
    readAuthTablesPermission,
  ]);

  // ADMIN GROUP (broad access but not super admin)
  const adminGroup = PermissionGroup.create({
    app,
    id: 'admin_group',
    config: {
      name: 'Administrator',
      description: 'Administrative access to most system functions',
    },
  });

  adminGroup.addPermissions([
    readAccountsPermission,
    updateAccountsPermission,
    readRolesPermission,
    readPermissionsPermission,
    updatePermissionsPermission,
    updateRolesPermission,
    updateTablesPermission,
    readTablesPermission,
    readLogsPermission,
    readAuthUsersPermission,
    updateAuthUsersPermission,
    manageAllTablesPermission,
    manageAllStoragePermission,
    readAuthTablesPermission,
  ]);

  // MANAGER GROUP (content management)
  const managerGroup = PermissionGroup.create({
    app,
    id: 'manager_group',
    config: {
      name: 'Manager',
      description: 'Content management and basic admin functions',
    },
  });

  managerGroup.addPermissions([
    // Limited system access
    readAccountsPermission,
    readRolesPermission,
    readTablesPermission,
    readLogsPermission,
    readAuthUsersPermission,
    // Data access
    readAllTablesPermission,
    updateAllTablesPermission,
    insertAllTablesPermission,
    readAllStoragePermission,
  ]);

  // SUPPORT GROUP (customer support)
  const supportGroup = PermissionGroup.create({
    app,
    id: 'support_group',
    config: {
      name: 'Customer Support',
      description: 'Customer support access - read mostly, limited updates',
    },
  });

  supportGroup.addPermissions([
    readAccountsPermission,
    updateAccountsPermission, // Can update customer accounts
    readTablesPermission,
    readLogsPermission,
    readAuthUsersPermission,
    readAllTablesPermission,
    readAuthTablesPermission,
  ]);

  // READONLY GROUP (view only)
  const readonlyGroup = PermissionGroup.create({
    app,
    id: 'readonly_group',
    config: {
      name: 'Read Only',
      description: 'Read-only access to data and basic system info',
    },
  });

  readonlyGroup.addPermissions([
    readAccountsPermission,
    readRolesPermission,
    readTablesPermission,
    readLogsPermission,
    readAuthUsersPermission,
    readAllTablesPermission,
    readPermissionsPermission,
    readAuthTablesPermission,
  ]);

  // DEVELOPER GROUP (technical access)
  const developerGroup = PermissionGroup.create({
    app,
    id: 'developer_group',
    config: {
      name: 'Developer',
      description: 'Technical access for developers and DevOps',
    },
  });

  developerGroup.addPermissions([
    // System access for development
    readAccountsPermission,
    readRolesPermission,
    readPermissionsPermission,
    manageTablesPermission, // Need to manage table configs
    readLogsPermission,
    readAuthUsersPermission,
    // Full data access for development
    manageAllTablesPermission,
    readAllStoragePermission,
    readAuthTablesPermission,
  ]);

  // ========================================
  // SECTION 4: ROLES
  // ========================================

  const rootRole = Role.create({
    app,
    id: 'root_role',
    config: {
      name: 'Root',
      description: 'Ultimate system access - use with extreme caution',
      rank: 100,
    },
  });

  const adminRole = Role.create({
    app,
    id: 'admin_role',
    config: {
      name: 'Admin',
      description: 'Administrative access to system functions',
      rank: 90,
    },
  });

  const managerRole = Role.create({
    app,
    id: 'manager_role',
    config: {
      name: 'Manager',
      description: 'Content management and basic admin functions',
      rank: 70,
    },
  });

  const developerRole = Role.create({
    app,
    id: 'developer_role',
    config: {
      name: 'Developer',
      description: 'Technical access for development and maintenance',
      rank: 80,
    },
  });

  const supportRole = Role.create({
    app,
    id: 'support_role',
    config: {
      name: 'Customer Support',
      description: 'Customer support and assistance functions',
      rank: 60,
    },
  });

  const readonlyRole = Role.create({
    app,
    id: 'readonly_role',
    config: {
      name: 'Read Only',
      description: 'Read-only access to system data',
      rank: 50,
    },
  });

  // Assign permission groups to roles
  rootRole.addPermissionGroup({ group: superAdminGroup });
  adminRole.addPermissionGroup({ group: adminGroup });
  managerRole.addPermissionGroup({ group: managerGroup });
  developerRole.addPermissionGroup({ group: developerGroup });
  supportRole.addPermissionGroup({ group: supportGroup });
  readonlyRole.addPermissionGroup({ group: readonlyGroup });

  // ========================================
  // SECTION 5: ACCOUNTS
  // ========================================

  const rootAccount = Account.create({
    app,
    id: options.rootAccountId ?? ROOT_ACCOUNT_ID,
  });

  // Assign roles to accounts
  rootAccount.assignRole(rootRole);

  // System Settings
  // Requires MFA is disabled by default
  SystemSetting.create({
    app,
    key: 'requires_mfa',
    value: 'false',
  });

  return app;
}
