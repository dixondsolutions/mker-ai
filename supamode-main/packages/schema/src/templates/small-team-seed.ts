import {
  Account,
  Permission,
  PermissionGroup,
  Role,
  SupamodeSeedGenerator,
  SystemSetting,
} from '../generator';

const app = new SupamodeSeedGenerator();

const ROOT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

export default function (options: { rootAccountId: string | undefined }) {
  /**
   * SMALL TEAM SEED - FOCUSED TEAM STRUCTURE
   *
   * This seed is designed for small development teams with clear role separation:
   *
   * 1. GLOBAL ADMIN - Complete system control and oversight
   * 2. DEVELOPERS - Technical access for development and maintenance
   * 3. CUSTOMER SUPPORT - Customer-focused access with limited system permissions
   *
   * Perfect for startups and small companies with 3-10 team members.
   */

  // ========================================
  // SYSTEM PERMISSIONS
  // ========================================

  // ADMIN PERMISSIONS (Global Admin needs everything)
  const manageSystemSettingsPermission = Permission.createSystemPermission({
    app,
    id: 'manage_system_settings',
    resource: 'system_setting',
    action: '*',
    name: 'Manage System Settings',
    description: 'Full control over system configuration',
  });

  const manageAccountsPermission = Permission.createSystemPermission({
    app,
    id: 'manage_accounts',
    resource: 'account',
    action: '*',
    name: 'Manage Accounts',
    description: 'Full account management capabilities',
  });

  const manageRolesPermission = Permission.createSystemPermission({
    app,
    id: 'manage_roles',
    resource: 'role',
    action: '*',
    name: 'Manage Roles',
    description: 'Complete role management',
  });

  const managePermissionsPermission = Permission.createSystemPermission({
    app,
    id: 'manage_permissions',
    resource: 'permission',
    action: '*',
    name: 'Manage Permissions',
    description: 'Full permission system control',
  });

  const manageTablesPermission = Permission.createSystemPermission({
    app,
    id: 'manage_tables',
    resource: 'table',
    action: '*',
    name: 'Manage Tables',
    description: 'Full table metadata management',
  });

  const manageAuthUsersPermission = Permission.createSystemPermission({
    app,
    id: 'manage_auth_users',
    resource: 'auth_user',
    action: '*',
    name: 'Manage Auth Users',
    description: 'Complete auth user management',
  });

  // READ-ONLY SYSTEM PERMISSIONS (for Developers and Support)
  const readAccountsPermission = Permission.createSystemPermission({
    app,
    id: 'read_accounts',
    resource: 'account',
    action: 'select',
    name: 'Read Accounts',
    description: 'View account information',
  });

  const readRolesPermission = Permission.createSystemPermission({
    app,
    id: 'read_roles',
    resource: 'role',
    action: 'select',
    name: 'Read Roles',
    description: 'View role information',
  });

  const readPermissionsPermission = Permission.createSystemPermission({
    app,
    id: 'read_permissions',
    resource: 'permission',
    action: 'select',
    name: 'Read Permissions',
    description: 'View permission information',
  });

  const readTablesPermission = Permission.createSystemPermission({
    app,
    id: 'read_tables',
    resource: 'table',
    action: 'select',
    name: 'Read Tables',
    description: 'View table metadata',
  });

  const readLogsPermission = Permission.createSystemPermission({
    app,
    id: 'read_logs',
    resource: 'log',
    action: 'select',
    name: 'Read Logs',
    description: 'Access to audit logs',
  });

  const readAuthUsersPermission = Permission.createSystemPermission({
    app,
    id: 'read_auth_users',
    resource: 'auth_user',
    action: 'select',
    name: 'Read System Auth Users',
    description: 'View auth user information',
  });

  // LIMITED UPDATE PERMISSIONS (for Support)
  const updateAccountsPermission = Permission.createSystemPermission({
    app,
    id: 'update_accounts',
    resource: 'account',
    action: 'update',
    name: 'Update Accounts',
    description: 'Update customer account information',
  });

  const updateAuthUsersPermission = Permission.createSystemPermission({
    app,
    id: 'update_auth_users',
    resource: 'auth_user',
    action: 'update',
    name: 'Update Auth Users',
    description: 'Update auth user information',
  });

  // ========================================
  // DATA PERMISSIONS
  // ========================================

  // FULL DATA ACCESS (Admin & Developers)
  const manageAllTablesPermission = Permission.createDataPermission({
    app,
    id: 'manage_all_tables',
    name: 'Manage All Tables',
    description: 'Full CRUD access to all database tables',
    scope: 'table',
    schema_name: 'public',
    table_name: '*',
    action: '*',
  });

  // READ-ONLY DATA ACCESS (Support)
  const readAllTablesPermission = Permission.createDataPermission({
    app,
    id: 'read_all_tables',
    name: 'Read All Tables',
    description: 'Read access to all database tables',
    scope: 'table',
    schema_name: 'public',
    table_name: '*',
    action: 'select',
  });

  // LIMITED UPDATE ACCESS (Support - for customer data)
  const updateCustomerDataPermission = Permission.createDataPermission({
    app,
    id: 'update_customer_data',
    name: 'Update Customer Data',
    description: 'Update customer-related tables',
    scope: 'table',
    schema_name: 'public',
    table_name: 'customers,orders,support_tickets',
    action: 'update',
  });

  // STORAGE PERMISSIONS
  const manageAllStoragePermission = Permission.createDataPermission({
    app,
    id: 'manage_all_storage',
    scope: 'storage',
    action: '*',
    name: 'Manage All Storage',
    description: 'Full storage management access',
    metadata: {
      bucket_name: '*',
      path_pattern: '*',
    },
  });

  const readAllStoragePermission = Permission.createDataPermission({
    app,
    id: 'read_all_storage',
    scope: 'storage',
    action: 'select',
    name: 'Read All Storage',
    description: 'Read access to storage files',
    metadata: {
      bucket_name: '*',
      path_pattern: '*',
    },
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

  // ========================================
  // PERMISSION GROUPS
  // ========================================

  // GLOBAL ADMIN GROUP (everything)
  const globalAdminGroup = PermissionGroup.create({
    app,
    id: 'global_admin_group',
    config: {
      name: 'Global Administrator',
      description:
        'Complete system administration - full access to all features',
    },
  });

  globalAdminGroup.addPermissions([
    // System permissions
    manageSystemSettingsPermission,
    manageAccountsPermission,
    manageRolesPermission,
    managePermissionsPermission,
    manageTablesPermission,
    manageAuthUsersPermission,
    readLogsPermission,
    // Data permissions
    manageAllTablesPermission,
    manageAllStoragePermission,
    readAuthTablesPermission,
  ]);

  // DEVELOPER GROUP (technical access)
  const developerGroup = PermissionGroup.create({
    app,
    id: 'developer_group',
    config: {
      name: 'Developer',
      description:
        'Technical access for development, debugging, and maintenance',
    },
  });

  developerGroup.addPermissions([
    // System access (read-only except tables)
    readAccountsPermission,
    readRolesPermission,
    readPermissionsPermission,
    manageTablesPermission, // Developers need to manage table configs
    readLogsPermission,
    readAuthUsersPermission,
    // Full data access for development
    manageAllTablesPermission,
    readAllStoragePermission, // Can read storage but not delete
    readAuthTablesPermission,
  ]);

  // CUSTOMER SUPPORT GROUP (customer-focused)
  const customerSupportGroup = PermissionGroup.create({
    app,
    id: 'customer_support_group',
    config: {
      name: 'Customer Support',
      description:
        'Customer assistance - read access with limited update capabilities',
    },
  });

  customerSupportGroup.addPermissions([
    // Limited system access
    readAccountsPermission,
    updateAccountsPermission, // Can update customer accounts
    readTablesPermission,
    readLogsPermission, // Can view audit logs for support
    readAuthUsersPermission,
    updateAuthUsersPermission, // Can help users with auth issues
    // Limited data access
    readAllTablesPermission,
    updateCustomerDataPermission, // Can update customer-related data
    readAllStoragePermission, // Can view uploaded files
    readAuthTablesPermission,
  ]);

  // ========================================
  // ROLES
  // ========================================

  const globalAdminRole = Role.create({
    app,
    id: 'global_admin_role',
    config: {
      name: 'Global Admin',
      description: 'Ultimate system administrator with complete access',
      rank: 100,
    },
  });

  const developerRole = Role.create({
    app,
    id: 'developer_role',
    config: {
      name: 'Developer',
      description:
        'Technical team member with development and maintenance access',
      rank: 80,
    },
  });

  const customerSupportRole = Role.create({
    app,
    id: 'customer_support_role',
    config: {
      name: 'Customer Support',
      description: 'Support team member focused on customer assistance',
      rank: 60,
    },
  });

  // Assign permission groups to roles
  globalAdminRole.addPermissionGroup({ group: globalAdminGroup });
  developerRole.addPermissionGroup({ group: developerGroup });
  customerSupportRole.addPermissionGroup({ group: customerSupportGroup });

  // ========================================
  // SAMPLE ACCOUNTS
  // ========================================

  // Global Admin Account
  const adminAccount = Account.create({
    app,
    id: options.rootAccountId ?? ROOT_ACCOUNT_ID,
    config: {
      metadata: {
        display_name: 'Team Lead / Admin',
        email: 'admin@company.com',
        department: 'Leadership',
        notes: 'Global administrator with complete system access',
      },
    },
  });

  // Assign roles to accounts
  adminAccount.assignRole(globalAdminRole);

  // ========================================
  // SYSTEM SETTINGS
  // ========================================

  // Enable MFA for security in team environment
  SystemSetting.create({
    app,
    key: 'requires_mfa',
    value: 'false',
  });
}
