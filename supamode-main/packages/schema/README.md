# Supamode Database Model Documentation

Welcome to Supamode! This documentation will help you understand the database model and how to seed it for your own application.

## Overview

Supamode uses a permission-based access control system with roles, permissions, and permission groups to give you fine-grained control over who can access what in your Supabase application. This documentation provides a comprehensive guide to understanding and implementing this system in your project.

## Core Concepts

At the heart of Supamode is a robust role-based access control (RBAC) system. Here are the essential components:

### Accounts and Users

- **Accounts**: Supamode accounts link to Supabase auth users. Each account represents a unique identity in the system that can be assigned roles and permissions.
- **Users**: Authenticated users who can be assigned roles. These correspond to your end users who will interact with the system.

### Roles

Roles are collections of permissions that can be assigned to users. They have priorities that determine their hierarchy. Roles make it easy to assign multiple permissions at once and manage permissions for groups of users with similar access needs.

### Permissions

Permissions define what actions can be performed on what resources. Supamode provides a granular permission system with four levels of scope:

1. **Database-level permissions**: Control access to the entire database
2. **Schema-level permissions**: Control access to specific schemas
3. **Table-level permissions**: Control access to specific tables
4. **Column-level permissions**: Control access to specific columns

This hierarchical approach allows you to precisely control who can access your data.

### Permission Groups

Permission groups bundle related permissions together for easier management. Instead of assigning dozens of individual permissions to roles, you can create logical groupings (like "Content Management" or "User Administration") and assign these groups to roles.

### System Permissions

System permissions control access to the Supamode system itself (e.g., managing roles, permissions, etc.). These are separate from the data permissions and control who can administer the Supamode interface.

## Database Schema

The Supamode database schema consists of multiple interconnected tables that implement the permission system. Understanding this schema is essential for advanced customization and troubleshooting.

### Core Tables

These tables form the foundation of the Supamode system:

- `supamode.accounts`: Links to Supabase auth users. Each record represents a unique user account in the system.
- `supamode.roles`: Defines available roles with properties like name, description, rank, and metadata. The rank field is particularly important as it determines role hierarchy.
- `supamode.permissions`: Defines regular permissions with details about what actions can be performed on which database objects.
- `supamode.system_permissions`: Defines system permissions for managing the Supamode interface itself.
- `supamode.permission_groups`: Defines permission groups that bundle related permissions together.

### Junction Tables

These tables create relationships between the core entities:

- `supamode.account_roles`: Links accounts to roles, establishing which users have which roles.
- `supamode.role_permissions`: Links roles to regular permissions, defining what each role can do.
- `supamode.role_system_permissions`: Links roles to system permissions for administrative access.
- `supamode.role_permission_groups`: Links roles to permission groups, allowing bulk permission assignment.
- `supamode.permission_group_permissions`: Links permission groups to regular permissions, defining which permissions belong to which groups.
- `supamode.permission_group_system_permissions`: Links permission groups to system permissions.

### Additional Tables

These tables provide additional functionality:

- `supamode.role_hierarchy`: Defines the hierarchy between roles, supporting permission inheritance.
- `supamode.managed_tables`: Configuration for tables managed by Supamode, including UI settings.
- `supamode.managed_columns`: Configuration for columns in managed tables, including display properties.
- `supamode.custom_views`: Custom views for managed tables, allowing for specialized data presentations.
- `supamode.table_relations`: Defines relationships between tables, supporting navigation and referential integrity.
- `supamode.user_preferences`: User-specific preferences for the Supamode interface.
- `supamode.saved_filters`: Saved filters for managed tables, allowing users to quickly access common data views.

## Seeding Your Database

Below is a step-by-step guide to seed your database using the TypeScript API provided by Supamode. This process allows you to programmatically set up your entire permission structure.

### 1. Initialize Supamode

Start by creating a new Supamode instance that will serve as the container for all your configuration:

```typescript
import { Supamode } from './schema';

const app = new Supamode();
```

This instance will track all entities and relationships you define, and eventually generate the necessary SQL to populate your database.

### 2. Define Users

Create user records that will be able to access your system. These should correspond to actual users in your Supabase authentication system:

```typescript
import { User } from './schema';

// Example admin user
const adminUser = new User(app, 'admin', {
  email: 'admin@example.com',
  password: 'securePassword', // Will be hashed automatically
  account: { isActive: true },
});

// Example regular user
const regularUser = new User(app, 'regular', {
  email: 'user@example.com',
  password: 'securePassword',
  account: { isActive: true },
});
```

Each user needs a unique identifier, email, and password. You can also provide additional metadata as needed.

### 3. Define Roles

Roles are the primary way to group permissions. Create roles with appropriate names, descriptions, and rank levels:

```typescript
import { Role } from './schema';

// Admin role
const adminRole = new Role(app, 'admin', {
  name: 'Administrator',
  description: 'Full access to the system',
  isSystemRole: true,
  rank: 100, // Higher rank roles override lower ones
});

// Editor role
const editorRole = new Role(app, 'editor', {
  name: 'Editor',
  description: 'Can edit content',
  isSystemRole: true,
  rank: 80,
});

// Viewer role
const viewerRole = new Role(app, 'viewer', {
  name: 'Viewer',
  description: 'Can only view content',
  isSystemRole: true,
  rank: 60,
});
```

The rank field is particularly important as it determines role hierarchy – higher rank roles can override lower rank ones.

### 4. Define Regular Permissions

Regular permissions control access to your database objects. The Permission factory provides different classes for each permission scope:

```typescript
import { Permission } from './schema';

// Database-level permission example
const viewAllPermission = new Permission.Database(app, 'view_all', {
  name: 'View All Content',
  description: 'Can view all content in the database',
  action: 'read',
});

// Schema-level permission example
const managePublicSchemaPermission = new Permission.Schema(
  app,
  'manage_public',
  {
    name: 'Manage Public Schema',
    description: 'Can manage all tables in the public schema',
    action: 'write',
    schemaName: 'public',
  },
);

// Table-level permission example
const editPostsPermission = new Permission.Table(app, 'edit_posts', {
  name: 'Edit Posts',
  description: 'Can edit posts',
  action: 'write',
  schemaName: 'public',
  tableName: 'posts',
});

// Table-level permission for ALL tables in a schema
const editAllTablesPermission = new Permission.Table(app, 'edit_all_tables', {
  name: 'Edit All Tables',
  description: 'Can edit all tables in the public schema',
  action: 'write',
  schemaName: 'public',
  tableName: '*', // Wildcard for ALL tables
});

// Column-level permission example
const viewEmailPermission = new Permission.Column(app, 'view_user_email', {
  name: 'View User Email',
  description: 'Can view user email addresses',
  action: 'read',
  schemaName: 'public',
  tableName: 'users',
  columnName: 'email',
});

// Column-level permission for ALL columns in a table
const viewAllUserColumnsPermission = new Permission.Column(
  app,
  'view_all_user_columns',
  {
    name: 'View All User Columns',
    description: 'Can view all columns in the users table',
    action: 'read',
    schemaName: 'public',
    tableName: 'users',
    columnName: '*', // Wildcard for ALL columns
  },
);
```

Note how each permission type requires different parameters based on its scope. The wildcard character `*` can be used to grant permission to all tables in a schema or all columns in a table.

### 5. Define System Permissions

System permissions control access to the Supamode administration interface itself. These permissions determine who can manage roles, users, and system settings:

```typescript
import { SystemPermission } from './schema';

const manageRolesPermission = new SystemPermission(app, 'manage_roles', {
  resource: 'role',
  action: 'manage',
  name: 'Manage Roles',
  description: 'Can create, edit, and delete roles',
});

const viewSettingsPermission = new SystemPermission(app, 'view_settings', {
  resource: 'system_setting',
  action: 'read',
  name: 'View Settings',
  description: 'Can view system settings',
});
```

Each system permission specifies a resource type (like 'role', 'membership', or 'system_setting') and an action to perform on that resource. These permissions are essential for controlling who can administer your Supamode instance.

### 6. Define Permission Groups

Permission groups allow you to bundle related permissions together for easier management. This is especially useful when you have many permissions that are typically assigned together:

```typescript
import { PermissionGroup } from './schema';

const contentManagementGroup = new PermissionGroup(app, 'content_management', {
  name: 'Content Management',
  description: 'Permissions for managing content',
  category: 'content',
  rank: 100,
  isSystemGroup: true,
});

const userManagementGroup = new PermissionGroup(app, 'user_management', {
  name: 'User Management',
  description: 'Permissions for managing users',
  category: 'users',
  rank: 90,
  isSystemGroup: true,
});
```

Permission groups can be categorized and prioritized, making it easier to organize large permission sets. System groups are typically predefined groups that are essential for the system's operation.

### 7. Assign Permissions to Groups

Once you've defined your permission groups, you can add permissions to them. This creates a logical bundling of related permissions:

```typescript
// Add permissions to groups
contentManagementGroup.addPermissions([
  editPostsPermission,
  // Add more content-related permissions
]);

userManagementGroup.addPermissions([
  viewEmailPermission,
  // Add more user-related permissions
]);
```

You can add multiple permissions at once using the `addPermissions` method, or add them individually with `addPermission`. This step establishes which permissions belong to which groups.

### 8. Assign Roles to Users

With your roles and users defined, you can now assign roles to users:

```typescript
// Assign roles to users
adminRole.assignToUsers(adminUser);
editorRole.assignToUsers(regularUser);
```

A user can have multiple roles, and you can assign a role to multiple users at once. The user will have all permissions from all assigned roles, with higher-rank roles taking precedence in case of conflicts.

### 9. Assign Permissions and Groups to Roles

The final step in building your permission structure is to assign permissions and permission groups to roles:

```typescript
// Assign individual permissions to roles
adminRole.addPermissions([
  viewAllPermission,
  managePublicSchemaPermission,
  // Add more permissions as needed
]);

editorRole.addPermissions([
  editPostsPermission,
  // Add more permissions as needed
]);

viewerRole.addPermissions([
  viewAllPermission,
  // Add more view-only permissions
]);

// Assign system permissions to roles
adminRole.addSystemPermissions([manageRolesPermission, viewSettingsPermission]);

// Assign permission groups to roles
adminRole.addPermissionGroups([contentManagementGroup, userManagementGroup]);

editorRole.addPermissionGroups([contentManagementGroup]);
```

This is where you define what each role can do. You can assign both individual permissions and entire permission groups to roles, giving you flexibility in how you structure your access control.

### 10. Generate and Deploy Configuration

After defining all your users, roles, permissions, and their relationships, you can generate the configuration and deploy it to your database:

```typescript
// Get the full configuration
const config = app.getConfig();

// Deploy the configuration
await app.deploy();
```

The `getConfig()` method returns a complete JSON representation of your permission structure, which can be useful for debugging or for manual deployment. The `deploy()` method will generate and execute the necessary SQL statements to update your database with the configuration.

## Role Hierarchy and Inheritance

Supamode supports role hierarchy and permission inheritance, allowing you to create complex permission structures while minimizing redundancy. Higher rank roles can inherit permissions from lower rank roles.

```typescript
// Example of setting up role hierarchy
const roleHierarchy = [
  { parent: adminRole, child: editorRole },
  { parent: editorRole, child: viewerRole },
];
```

In this example, the Admin role inherits all permissions from the Editor role, which in turn inherits all permissions from the Viewer role. This means you only need to assign permissions to the lowest role that should have them, reducing duplication and making maintenance easier.

## Permission Scopes and Actions

The Supamode permission system is built around the concepts of scopes (what resource is being accessed) and actions (what operation is being performed). Understanding these concepts is crucial for designing an effective permission structure.

### Scopes

Scopes define the granularity of access control:

- `database`: The entire database - this is the broadest scope
- `schema`: A specific schema - controls access to all tables within a schema
- `table`: A specific table - controls access to all rows and columns in a table
- `column`: A specific column - the most granular level of access control

Each scope type is implemented as a different class in the Permission factory.

### Wildcards

Supamode supports using the wildcard character `*` to represent "ALL" in various contexts:

- In table-level permissions: `tableName: '*'` grants access to all tables in the specified schema
- In column-level permissions: `columnName: '*'` grants access to all columns in the specified table
- This simplifies permission management when you need to grant broad access within a specific scope

### Actions

Actions define what operations are allowed:

- `read`: View data
- `write`: Create or update data
- `update`: Update existing data
- `delete`: Delete data
- `manage`: Full control, includes all other actions (read, write, update, delete)

By combining scopes and actions, you can create very specific permission rules tailored to your application's needs.

## Conditions and Constraints

One of Supamode's most powerful features is the ability to add conditions to permissions. This allows you to implement row-level security and other complex access patterns:

```typescript
// Example: User can only edit their own posts
const editOwnPostsPermission = new Permission.Table(app, 'edit_own_posts', {
  name: 'Edit Own Posts',
  description: 'Can edit only their own posts',
  action: 'write',
  schemaName: 'public',
  tableName: 'posts',
  conditions: { column: 'author_id', equals: '$CURRENT_USER_ID' },
});
```

In this example, the `conditions` property restricts the permission to only affect rows where the 'author_id' column matches the current user's ID. This is implemented using Supabase's Row Level Security (RLS) policies behind the scenes.

You can create complex conditions using various operators and even combine multiple conditions for sophisticated access control patterns.

## Best Practices

Designing an effective permission system requires careful planning. Here are some best practices to guide your implementation:

1. **Start Simple**: Begin with a few roles and permissions, then expand as needed. It's easier to add complexity later than to simplify an overly complex system.
2. **Use Permission Groups**: Group related permissions together for easier management. This reduces redundancy and makes it clearer what each role can do.
3. **Role Hierarchy**: Use role hierarchy to avoid permission duplication. Design your roles with inheritance in mind, placing common permissions at lower levels of the hierarchy.
4. **Regular Audit**: Regularly review and audit permissions. As your application evolves, so will your permission requirements.
5. **Principle of Least Privilege**: Always assign the minimum permissions necessary for a user to perform their tasks. This reduces the risk of accidental or malicious data exposure.

By following these practices, you can create a permission system that is both secure and manageable.

## Advanced Usage

Supamode offers several advanced features for more sophisticated permission management scenarios. These features allow you to implement time-based access, store custom metadata, and more.

### Time-Based Permissions

You can set `valid_from` and `valid_until` on role assignments for temporary access. This is particularly useful for contractors, temporary employees, or time-limited promotional access:

```typescript
// Example of time-limited role assignment
const temporaryEditorRole = new Role(app, 'temp_editor', {
  name: 'Temporary Editor',
  description: 'Temporary editing rights',
  rank: 75,
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
});
```

The role will automatically expire after the specified end date, without requiring manual intervention. This helps maintain security by ensuring temporary access doesn't become permanent by oversight.

### Custom Metadata

You can add custom metadata to roles, permissions, and users. This metadata can be used for your application's specific needs, such as tracking department information, external system IDs, or user preferences:

```typescript
const customRole = new Role(app, 'custom', {
  name: 'Custom Role',
  description: 'Role with custom metadata',
  metadata: {
    department: 'Marketing',
    external_id: 'MKT-001',
    custom_settings: { theme: 'dark' },
  },
});
```

This metadata is stored as JSON and can be queried and updated through the Supamode API. It provides a flexible way to extend the permission system with your own application-specific information. time-limited role assignment

```ts
const temporaryEditorRole = new Role(app, 'temp_editor', {
  name: 'Temporary Editor',
  description: 'Temporary editing rights',
  rank: 75,
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
});
```

### Custom Metadata

You can add custom metadata to roles, permissions, and users:

```typescript
const customRole = new Role(app, 'custom', {
  name: 'Custom Role',
  description: 'Role with custom metadata',
  metadata: {
    department: 'Marketing',
    external_id: 'MKT-001',
    custom_settings: { theme: 'dark' },
  },
});
```

## Troubleshooting

### Common Issues

1. **Permission Not Working**: Check role assignments, permission definitions, and conditions
2. **Role Hierarchy Issues**: Ensure that role priorities are set correctly
3. **Missing Permission**: Verify that all required permissions are assigned to the role

### Debugging

1. Use the `supamode.has_data_permission()` function to check if a user has a specific permission
2. Check the `supamode.get_effective_permissions()` function to see all permissions a role has

## Conclusion

This documentation covers the basics of setting up and using the Supamode database model. For more detailed information, refer to the API documentation or contact the Supamode support team.

Remember, a well-designed permission system is critical for security and usability. Take the time to plan your roles and permissions carefully before implementation.
