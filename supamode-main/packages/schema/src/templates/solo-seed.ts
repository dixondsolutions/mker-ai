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
   * SOLOPRENEUR SEED - ALL PERMISSIONS FOR SINGLE USER
   *
   * This seed is designed for solopreneurs working alone who need complete
   * control over their Supabase project. It creates a single user with
   * comprehensive permissions to manage every aspect of the system:
   *
   * - Full system administration
   * - Complete database access (all schemas/tables)
   * - User and role management
   * - Storage management
   * - Audit log access
   * - Table metadata configuration
   */

  // ========================================
  // SYSTEM PERMISSIONS - COMPLETE SET
  // ========================================

  // System Settings Management
  const manageSystemSettingsPermission = Permission.createSystemPermission({
    app,
    id: 'manage_system_settings',
    resource: 'system_setting',
    action: '*',
    name: 'Manage System Settings',
    description: 'Full control over system configuration and settings',
  });

  // Account Management (Full Control)
  const manageAccountsPermission = Permission.createSystemPermission({
    app,
    id: 'manage_accounts',
    resource: 'account',
    action: '*',
    name: 'Manage All Accounts',
    description: 'Complete account management - create, read, update, delete',
  });

  // Role Management (Full Control)
  const manageRolesPermission = Permission.createSystemPermission({
    app,
    id: 'manage_roles',
    resource: 'role',
    action: '*',
    name: 'Manage All Roles',
    description: 'Complete role management and hierarchy configuration',
  });

  // Permission Management (Full Control)
  const managePermissionsPermission = Permission.createSystemPermission({
    app,
    id: 'manage_permissions',
    resource: 'permission',
    action: '*',
    name: 'Manage All Permissions',
    description: 'Complete permission system administration',
  });

  // Table Metadata Management (Full Control)
  const manageTablesPermission = Permission.createSystemPermission({
    app,
    id: 'manage_tables',
    resource: 'table',
    action: '*',
    name: 'Manage Table Metadata',
    description: 'Full control over table configurations and metadata',
  });

  // Audit Log Access (Read Only)
  const readLogsPermission = Permission.createSystemPermission({
    app,
    id: 'read_logs',
    resource: 'log',
    action: 'select',
    name: 'Access Audit Logs',
    description: 'Full access to system audit logs and activity tracking',
  });

  // Auth User Table (Read)
  const readAuthUsersPermission = Permission.createDataPermission({
    app,
    id: 'read_auth_users',
    scope: 'table',
    action: 'select',
    schema_name: 'auth',
    table_name: 'users',
    name: 'Read Data Auth Users',
    description: 'Read access to all auth users in the system',
  });

  // Auth User (Manage)
  const manageSystemAuthUsersPermission = Permission.createSystemPermission({
    app,
    id: 'read_system_auth_users',
    resource: 'auth_user',
    action: '*',
    name: 'Manage System Auth Users',
    description: 'Manage access to all auth users in the system',
  });

  // ========================================
  // DATA PERMISSIONS - COMPREHENSIVE ACCESS
  // ========================================

  // All Tables - Full Access (Public Schema)
  const manageAllPublicTablesPermission = Permission.createDataPermission({
    app,
    id: 'manage_all_public_tables',
    name: 'Manage All Public Tables',
    description: 'Complete CRUD access to all tables in public schema',
    scope: 'table',
    schema_name: 'public',
    table_name: '*',
    action: '*',
  });

  const readAuthUsersTablePermission = Permission.createDataPermission({
    app,
    id: 'read_auth_users_table',
    name: 'Read Auth Users Table',
    description: 'Read access to all auth users in the system',
    scope: 'table',
    schema_name: 'auth',
    table_name: 'users',
    action: 'select',
  });

  // All Storage - Full Access
  const manageAllStoragePermission = Permission.createDataPermission({
    app,
    id: 'manage_all_storage',
    scope: 'storage',
    action: '*',
    name: 'Manage All Storage',
    description: 'Complete storage management across all buckets and paths',
    metadata: {
      bucket_name: '*',
      path_pattern: '*',
    },
  });

  // ========================================
  // PERMISSION GROUP - SOLOPRENEUR
  // ========================================

  const solopreneurGroup = PermissionGroup.create({
    app,
    id: 'solopreneur_group',
    config: {
      name: 'Solopreneur Complete Access',
      description:
        'Comprehensive permissions for solo business owners - full system control',
    },
  });

  // Add all permissions to the solopreneur group
  solopreneurGroup.addPermissions([
    // System permissions
    manageSystemSettingsPermission,
    manageAccountsPermission,
    manageRolesPermission,
    managePermissionsPermission,
    manageTablesPermission,
    readLogsPermission,
    readAuthUsersPermission,
    manageSystemAuthUsersPermission,
    // Data permissions
    manageAllPublicTablesPermission,
    manageAllStoragePermission,
    readAuthUsersTablePermission,
  ]);

  // ========================================
  // ROLE - SOLOPRENEUR
  // ========================================

  const solopreneurRole = Role.create({
    app,
    id: 'solopreneur_role',
    config: {
      name: 'Solopreneur',
      description:
        'Complete system access for business owners working independently',
      rank: 100, // Highest rank
    },
  });

  // Assign the comprehensive permission group to the role
  solopreneurRole.addPermissionGroup({ group: solopreneurGroup });

  // ========================================
  // ACCOUNT - SOLOPRENEUR
  // ========================================

  const solopreneurAccount = Account.create({
    app,
    id: options.rootAccountId ?? ROOT_ACCOUNT_ID,
  });

  // Assign the solopreneur role to the account
  solopreneurAccount.assignRole(solopreneurRole);

  // ========================================
  // SYSTEM SETTINGS
  // ========================================

  // Disable MFA requirement for simplicity in solo setup
  SystemSetting.create({
    app,
    key: 'requires_mfa',
    value: 'false',
  });

  return app;
}
