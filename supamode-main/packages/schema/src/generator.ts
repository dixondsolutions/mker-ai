import { z } from 'zod';

/**
 * Enum definitions
 */
const permissionScopeSchema = z.enum(['table', 'column', 'storage']);

const systemResourceSchema = z.enum([
  'account',
  'role',
  'permission',
  'log',
  'table',
  'auth_user',
  'system_setting',
]);

const actionSchema = z.enum(['select', 'insert', 'update', 'delete', '*']);

/**
 * Unified permission schema (combining system and data permissions)
 */
const permissionConfigSchema = z.discriminatedUnion('permission_type', [
  // System permission
  z.object({
    permission_type: z.literal('system'),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    system_resource: systemResourceSchema,
    action: actionSchema,
    metadata: z.record(z.any(), z.any()).default({}).optional(),
  }),

  // Data permission
  z.object({
    permission_type: z.literal('data'),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    scope: permissionScopeSchema,
    action: actionSchema,
    schema_name: z.string().optional(),
    table_name: z.string().optional(),
    column_name: z.string().optional(),
    constraints: z.record(z.any(), z.any()).optional().nullable(),
    conditions: z.record(z.any(), z.any()).optional().nullable(),
    metadata: z.record(z.any(), z.any()).default({}).optional(),
  }),
]);

/**
 * Role configuration schema
 */
const roleConfigSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  rank: z.number().int().min(0).max(100).default(0),
  metadata: z.record(z.any(), z.any()).default({}).optional(),
  valid_from: z.date().optional(),
  valid_until: z.date().optional(),
});

/**
 * Permission group schema
 */
const permissionGroupConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  metadata: z.record(z.any(), z.any()).default({}).optional(),
});

/**
 * Account permission override schema
 */
const accountPermissionSchema = z.object({
  permission_name: z.string(), // Changed from permission_id to permission_name
  is_grant: z.boolean(),
  valid_from: z.date().optional(),
  valid_until: z.date().optional(),
  metadata: z.record(z.any(), z.any()).default({}).optional(),
});

const accountConfigSchema = z.object({
  metadata: z.record(z.any(), z.any()).default({}).optional(),
});

/**
 * Enhanced SupaMode Seed Generator with better error handling and SQL generation
 */
export class SupamodeSeedGenerator {
  private permissions: Record<string, Permission> = {};
  private roles: Record<string, Role> = {};
  private accounts: Record<string, Account> = {};
  private permissionGroups: Record<string, PermissionGroup> = {};
  private systemSettings: Record<string, SystemSetting> = {};

  addSystemSetting(key: string, systemSetting: SystemSetting) {
    if (this.systemSettings[key]) {
      throw new Error(`System setting with key '${key}' already exists`);
    }

    this.systemSettings[key] = systemSetting;
    return this;
  }

  addPermission(id: string, permission: Permission) {
    if (this.permissions[id]) {
      throw new Error(`Permission with ID '${id}' already exists`);
    }
    this.permissions[id] = permission;
    return this;
  }

  addRole(id: string, role: Role) {
    if (this.roles[id]) {
      throw new Error(`Role with ID '${id}' already exists`);
    }
    this.roles[id] = role;
    return this;
  }

  addAccount(id: string, account: Account) {
    if (this.accounts[id]) {
      throw new Error(`Account with ID '${id}' already exists`);
    }
    this.accounts[id] = account;
    return this;
  }

  addPermissionGroup(id: string, group: PermissionGroup) {
    if (this.permissionGroups[id]) {
      throw new Error(`Permission group with ID '${id}' already exists`);
    }
    this.permissionGroups[id] = group;
    return this;
  }

  getPermission(id: string) {
    const permission = this.permissions[id];
    if (!permission) {
      throw new Error(`Permission with ID '${id}' not found`);
    }
    return permission;
  }

  getRole(id: string) {
    const role = this.roles[id];
    if (!role) {
      throw new Error(`Role with ID '${id}' not found`);
    }
    return role;
  }

  getAccount(id: string) {
    const account = this.accounts[id];
    if (!account) {
      throw new Error(`Account with ID '${id}' not found`);
    }
    return account;
  }

  getPermissionGroup(id: string) {
    const group = this.permissionGroups[id];
    if (!group) {
      throw new Error(`Permission group with ID '${id}' not found`);
    }
    return group;
  }

  /**
   * Fixed SQL generation with proper ordering and error handling
   */
  generateSql(): string[] {
    const statements: string[] = [];

    try {
      // 0. Generate system settings
      statements.push('-- Creating system settings');

      Object.values(this.systemSettings).forEach((systemSetting) => {
        statements.push(systemSetting.generateSql());
      });

      // 1. Generate permissions first
      statements.push('-- Creating permissions');
      Object.values(this.permissions).forEach((permission) => {
        statements.push(permission.generateSql());
      });

      // 2. Generate permission groups
      statements.push('-- Creating permission groups');
      Object.values(this.permissionGroups).forEach((group) => {
        statements.push(group.generateSql());
      });

      // 3. Generate roles
      statements.push('-- Creating roles');
      Object.values(this.roles).forEach((role) => {
        statements.push(role.generateSql());
      });

      // 4. Generate accounts
      statements.push('-- Creating accounts');
      Object.values(this.accounts).forEach((account) => {
        statements.push(account.generateSql());
      });

      // 5. Generate permission group-permission assignments
      statements.push('-- Assigning permissions to permission groups');
      Object.values(this.permissionGroups).forEach((group) => {
        group.getPermissions().forEach((permId) => {
          try {
            const permission = this.getPermission(permId);
            statements.push(`
INSERT INTO supamode.permission_group_permissions (group_id, permission_id, added_at)
VALUES (${group.getIdQuery()}, ${permission.getIdQuery()}, NOW());`);
          } catch (error) {
            const msg =
              error instanceof Error ? error.message : 'Unknown error';

            console.warn(
              `Warning: ${msg} when assigning to group ${group.getId()}`,
            );
          }
        });
      });

      // 6. Generate role-permission assignments
      statements.push('-- Assigning permissions to roles');
      Object.values(this.roles).forEach((role) => {
        role.getPermissions().forEach((permId) => {
          try {
            const permission = this.getPermission(permId);
            statements.push(`
INSERT INTO supamode.role_permissions (role_id, permission_id)
VALUES (${role.getIdQuery()}, ${permission.getIdQuery()});`);
          } catch (error) {
            const msg =
              error instanceof Error ? error.message : 'Unknown error';

            console.warn(
              `Warning: ${msg} when assigning to role ${role.getId()}`,
            );
          }
        });
      });

      // 7. Generate role-permission group assignments
      statements.push('-- Assigning permission groups to roles');
      Object.values(this.roles).forEach((role) => {
        role.getPermissionGroups().forEach((groupId) => {
          try {
            const group = this.getPermissionGroup(groupId);
            statements.push(`
INSERT INTO supamode.role_permission_groups (role_id, group_id, assigned_at)
VALUES (${role.getIdQuery()}, ${group.getIdQuery()}, NOW());`);
          } catch (error) {
            const msg =
              error instanceof Error ? error.message : 'Unknown error';

            console.warn(
              `Warning: ${msg} when assigning group to role ${role.getId()}`,
            );
          }
        });
      });

      // 8. Generate account-role assignments
      statements.push('-- Assigning roles to accounts');
      Object.values(this.accounts).forEach((account) => {
        account.getRoles().forEach((roleId) => {
          try {
            const role = this.getRole(roleId);
            statements.push(`
INSERT INTO supamode.account_roles (account_id, role_id, assigned_at)
VALUES (${account.getIdFromAuthUser()}, ${role.getIdQuery()}, NOW());`);
          } catch (error) {
            const msg =
              error instanceof Error ? error.message : 'Unknown error';

            console.warn(
              `Warning: ${msg} when assigning role to account ${account.getId()}`,
            );
          }
        });
      });

      // 9. Generate account permission overrides
      statements.push('-- Creating account permission overrides');
      Object.values(this.accounts).forEach((account) => {
        account.getPermissionOverrides().forEach((override) => {
          statements.push(`
INSERT INTO supamode.account_permissions (account_id, permission_id, is_grant, valid_from, valid_until, metadata)
VALUES (
  ${account.getIdFromAuthUser()},
  (SELECT id FROM supamode.permissions WHERE name = '${override.permission_name}'),
  ${override.is_grant},
  ${override.valid_from ? `'${override.valid_from.toISOString()}'` : 'NULL'},
  ${override.valid_until ? `'${override.valid_until.toISOString()}'` : 'NULL'},
  '${JSON.stringify(override.metadata || {})}'::jsonb
);`);
        });
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';

      throw new Error(`Error generating SQL: ${msg}`);
    }

    return statements.filter((stmt) => stmt.trim().length > 0);
  }

  /**
   * Validate the entire configuration before generating SQL
   */
  validate(): void {
    // Check for circular dependencies
    Object.values(this.roles).forEach((role) => {
      role.getPermissions().forEach((permId) => {
        if (!this.permissions[permId]) {
          throw new Error(
            `Role '${role.getId()}' references non-existent permission '${permId}'`,
          );
        }
      });

      role.getPermissionGroups().forEach((groupId) => {
        if (!this.permissionGroups[groupId]) {
          throw new Error(
            `Role '${role.getId()}' references non-existent permission group '${groupId}'`,
          );
        }
      });
    });

    Object.values(this.accounts).forEach((account) => {
      account.getRoles().forEach((roleId) => {
        if (!this.roles[roleId]) {
          throw new Error(
            `Account '${account.getId()}' references non-existent role '${roleId}'`,
          );
        }
      });
    });
  }
}

/**
 * Enhanced Permission class with better SQL escaping
 */
export class Permission {
  private app: SupamodeSeedGenerator;
  private readonly id: string;
  private readonly config: z.infer<typeof permissionConfigSchema>;

  static create(params: {
    app: SupamodeSeedGenerator;
    id: string;
    config: z.infer<typeof permissionConfigSchema>;
  }) {
    return new Permission(params);
  }

  constructor(params: {
    app: SupamodeSeedGenerator;
    id: string;
    config: z.infer<typeof permissionConfigSchema>;
  }) {
    this.app = params.app;
    this.id = params.id;
    this.config = permissionConfigSchema.parse(params.config);

    params.app.addPermission(params.id, this);
  }

  getId() {
    return this.id;
  }

  getIdQuery() {
    return `(SELECT id FROM supamode.permissions WHERE name = '${this.escapeSql(this.config.name)}')`;
  }

  getConfig() {
    return this.config;
  }

  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }

  generateSql(): string {
    if (this.config.permission_type === 'system') {
      return `
INSERT INTO supamode.permissions (name, description, permission_type, system_resource, action, metadata)
VALUES (
  '${this.escapeSql(this.config.name)}',
  ${this.config.description ? `'${this.escapeSql(this.config.description)}'` : 'NULL'},
  'system',
  '${this.config.system_resource}',
  '${this.config.action}',
  '${JSON.stringify(this.config.metadata || {})}'::jsonb
);`;
    } else {
      return `
INSERT INTO supamode.permissions (name, description, permission_type, scope, schema_name, table_name, column_name, action, constraints, conditions, metadata)
VALUES (
  '${this.escapeSql(this.config.name)}',
  ${this.config.description ? `'${this.escapeSql(this.config.description)}'` : 'NULL'},
  'data',
  '${this.config.scope}',
  ${this.config.schema_name ? `'${this.escapeSql(this.config.schema_name)}'` : 'NULL'},
  ${this.config.table_name ? `'${this.escapeSql(this.config.table_name)}'` : 'NULL'},
  ${this.config.column_name ? `'${this.escapeSql(this.config.column_name)}'` : 'NULL'},
  '${this.config.action}',
  ${this.config.constraints ? `'${JSON.stringify(this.config.constraints)}'::jsonb` : 'NULL'},
  ${this.config.conditions ? `'${JSON.stringify(this.config.conditions)}'::jsonb` : 'NULL'},
  '${JSON.stringify(this.config.metadata || {})}'::jsonb
);`;
    }
  }

  // Factory methods using object parameters
  static createSystemPermission(params: {
    app: SupamodeSeedGenerator;
    id: string;
    resource: z.infer<typeof systemResourceSchema>;
    action: `select` | `insert` | `update` | `delete` | `*`;
    name: string;
    description?: string;
    metadata?: Record<string, any>;
  }) {
    return new Permission({
      app: params.app,
      id: params.id,
      config: {
        permission_type: 'system',
        name: params.name,
        description: params.description,
        system_resource: params.resource,
        action: params.action,
        metadata: params.metadata,
      },
    });
  }

  static createDataPermission(params: {
    app: SupamodeSeedGenerator;
    id: string;
    name: string;
    description?: string;
    scope: z.infer<typeof permissionScopeSchema>;
    action: `select` | `insert` | `update` | `delete` | `*`;
    schema_name?: string;
    table_name?: string;
    column_name?: string;
    constraints?: Record<string, any>;
    conditions?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    return new Permission({
      app: params.app,
      id: params.id,
      config: {
        permission_type: 'data',
        name: params.name,
        description: params.description,
        scope: params.scope,
        action: params.action,
        schema_name: params.schema_name,
        table_name: params.table_name,
        column_name: params.column_name,
        constraints: params.constraints,
        conditions: params.conditions,
        metadata: params.metadata,
      },
    });
  }
}

/**
 * Enhanced Role class with better SQL handling
 */
export class Role {
  private app: SupamodeSeedGenerator;
  private readonly id: string;
  private readonly config: z.infer<typeof roleConfigSchema>;
  private permissions: string[] = [];
  private permissionGroups: string[] = [];

  static create(params: {
    app: SupamodeSeedGenerator;
    id: string;
    config: z.infer<typeof roleConfigSchema>;
  }) {
    return new Role(params);
  }

  constructor(params: {
    app: SupamodeSeedGenerator;
    id: string;
    config: z.infer<typeof roleConfigSchema>;
  }) {
    this.app = params.app;
    this.id = params.id;
    this.config = roleConfigSchema.parse(params.config);

    params.app.addRole(params.id, this);
  }

  getIdQuery() {
    return `(SELECT id FROM supamode.roles WHERE name = '${this.escapeSql(this.config.name)}')`;
  }

  getId() {
    return this.id;
  }

  getConfig() {
    return this.config;
  }

  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }

  addPermissionGroup(params: {
    group: PermissionGroup;
    valid_from?: Date;
    valid_until?: Date;
    metadata?: Record<string, any>;
  }) {
    this.permissionGroups.push(params.group.getId());
    return this;
  }

  addPermission(permission: Permission) {
    this.permissions.push(permission.getId());
    return this;
  }

  addPermissions(permissions: Permission[]) {
    permissions.forEach((p) => this.addPermission(p));
    return this;
  }

  getPermissionGroups() {
    return this.permissionGroups;
  }

  getPermissions() {
    return this.permissions;
  }

  generateSql(): string {
    return `
INSERT INTO supamode.roles (name, description, rank, metadata, valid_from, valid_until)
VALUES (
  '${this.escapeSql(this.config.name)}',
  ${this.config.description ? `'${this.escapeSql(this.config.description)}'` : 'NULL'},
  ${this.config.rank},
  '${JSON.stringify(this.config.metadata || {})}'::jsonb,
  ${this.config.valid_from ? `'${this.config.valid_from.toISOString()}'` : 'NULL'},
  ${this.config.valid_until ? `'${this.config.valid_until.toISOString()}'` : 'NULL'}
);`;
  }
}

/**
 * Enhanced Account class with fixed permission overrides
 */
export class Account {
  private app: SupamodeSeedGenerator;
  private readonly id: string;
  private roles: string[] = [];
  private readonly config: z.infer<typeof accountConfigSchema>;
  private permissionOverrides: z.infer<typeof accountPermissionSchema>[] = [];

  static create(params: {
    app: SupamodeSeedGenerator;
    id: string;
    config?: { metadata: Record<string, any> };
  }) {
    return new Account(params);
  }

  constructor(params: {
    app: SupamodeSeedGenerator;
    id: string;
    config?: { metadata: Record<string, any> };
  }) {
    this.app = params.app;
    this.id = params.id;
    this.config = accountConfigSchema.parse(params.config ?? {});

    params.app.addAccount(params.id, this);
  }

  getId() {
    return this.id;
  }

  getIdFromAuthUser() {
    return `(SELECT id FROM supamode.accounts WHERE auth_user_id = '${this.id}')`;
  }

  assignRole(role: Role) {
    this.roles.push(role.getId());
    return this;
  }

  // Fixed: Now stores permission name instead of ID
  grantPermission(params: {
    permission: Permission;
    valid_from?: Date;
    valid_until?: Date;
    metadata?: Record<string, any>;
  }) {
    this.permissionOverrides.push({
      permission_name: params.permission.getConfig().name, // Store name, not ID
      is_grant: true,
      valid_from: params.valid_from,
      valid_until: params.valid_until,
      metadata: params.metadata,
    });
    return this;
  }

  denyPermission(params: {
    permission: Permission;
    valid_from?: Date;
    valid_until?: Date;
    metadata?: Record<string, any>;
  }) {
    this.permissionOverrides.push({
      permission_name: params.permission.getConfig().name, // Store name, not ID
      is_grant: false,
      valid_from: params.valid_from,
      valid_until: params.valid_until,
      metadata: params.metadata,
    });
    return this;
  }

  getRoles() {
    return this.roles;
  }

  getPermissionOverrides() {
    return this.permissionOverrides;
  }

  generateSql() {
    return `
${this.generateUserSql()}
${this.generateAccountSql()}`;
  }

  private generateUserSql() {
    return `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"supamode_access": "true"}'::jsonb WHERE id = '${this.id}';`;
  }

  private generateAccountSql() {
    return `INSERT INTO supamode.accounts (auth_user_id, metadata)
VALUES ('${this.id}', '${JSON.stringify(this.config.metadata || {})}'::jsonb);`;
  }
}

/**
 * Enhanced Permission Group class
 */
export class PermissionGroup {
  private app: SupamodeSeedGenerator;
  private readonly id: string;
  private readonly config: z.infer<typeof permissionGroupConfigSchema>;
  private permissions: string[] = [];

  static create(params: {
    app: SupamodeSeedGenerator;
    id: string;
    config: z.infer<typeof permissionGroupConfigSchema>;
  }) {
    return new PermissionGroup(params);
  }

  constructor(params: {
    app: SupamodeSeedGenerator;
    id: string;
    config: z.infer<typeof permissionGroupConfigSchema>;
  }) {
    this.app = params.app;
    this.id = params.id;
    this.config = permissionGroupConfigSchema.parse(params.config);

    params.app.addPermissionGroup(params.id, this);
  }

  getId() {
    return this.id;
  }

  getIdQuery() {
    return `(SELECT id FROM supamode.permission_groups WHERE name = '${this.escapeSql(this.config.name)}')`;
  }

  getConfig() {
    return this.config;
  }

  private escapeSql(value: string): string {
    return value.replace(/'/g, "''");
  }

  addPermission(permission: Permission) {
    this.permissions.push(permission.getId());
    return this;
  }

  addPermissions(permissions: Permission[]) {
    permissions.forEach((p) => this.addPermission(p));
    return this;
  }

  getPermissions() {
    return this.permissions;
  }

  generateSql(): string {
    return `
INSERT INTO supamode.permission_groups (name, description, metadata)
VALUES (
  '${this.escapeSql(this.config.name)}',
  ${this.config.description ? `'${this.escapeSql(this.config.description)}'` : 'NULL'},
  '${JSON.stringify(this.config.metadata || {})}'::jsonb
);`;
  }
}

/**
 * System setting class
 * @description A system setting is a key-value pair that is stored in the database.
 * It is used to store configuration settings for the application.
 */
export class SystemSetting {
  private app: SupamodeSeedGenerator;
  private readonly key: string;
  private readonly value: string;

  constructor(params: {
    app: SupamodeSeedGenerator;
    key: string;
    value: string;
  }) {
    this.app = params.app;
    this.key = params.key;
    this.value = params.value;

    params.app.addSystemSetting(params.key, this);
  }

  static create(params: {
    app: SupamodeSeedGenerator;
    key: string;
    value: string;
  }) {
    return new SystemSetting(params);
  }

  generateSql() {
    return `
INSERT INTO supamode.configuration (key, value)
VALUES ('${this.key}', '${this.value}');`;
  }
}

// Shortcuts

/**
 * Creates a system setting for the required MFA setting
 * @param app - The application instance
 * @returns The system setting
 */
export function createRequiredMfaSystemSetting(app: SupamodeSeedGenerator) {
  return SystemSetting.create({
    app,
    key: 'requires_mfa',
    value: 'true',
  });
}
