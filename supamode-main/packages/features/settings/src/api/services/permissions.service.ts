import { and, desc, eq, inArray } from 'drizzle-orm';
import { Context } from 'hono';

import {
  accountRolesInSupamode,
  permissionGroupPermissionsInSupamode,
  permissionGroupsInSupamode,
  permissionsInSupamode,
  rolePermissionGroupsInSupamode,
  rolePermissionsInSupamode,
  rolesInSupamode,
} from '@kit/supabase/schema';

/**
 * Creates a PermissionsService instance.
 */
export function createPermissionsService(c: Context) {
  return new PermissionsService(c);
}

/**
 * Permissions service for handling roles, permissions, and permission groups.
 */
class PermissionsService {
  constructor(private readonly context: Context) {}

  /**
   * Get all roles
   * @returns The roles
   */
  async getRoles() {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .select({
          id: rolesInSupamode.id,
          name: rolesInSupamode.name,
          description: rolesInSupamode.description,
          rank: rolesInSupamode.rank,
          validFrom: rolesInSupamode.validFrom,
          validUntil: rolesInSupamode.validUntil,
          metadata: rolesInSupamode.metadata,
          createdAt: rolesInSupamode.createdAt,
          updatedAt: rolesInSupamode.updatedAt,
        })
        .from(rolesInSupamode)
        .orderBy(desc(rolesInSupamode.rank));
    });
  }

  /**
   * Get a role by ID with permissions and permission groups
   * @param id - The ID of the role
   * @returns The role with permissions and permission groups
   */
  async getRole(id: string) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      // Get the role
      const role = await tx
        .select()
        .from(rolesInSupamode)
        .where(eq(rolesInSupamode.id, id))
        .limit(1)
        .then((rows) => rows[0]);

      if (!role) {
        return {
          roles: [],
          permissions: [],
          role_permissions: [],
          permission_groups: [],
          role_permission_groups: [],
        };
      }

      // Get the role's permissions
      const rolePermissions = await tx
        .select({
          role_permissions: rolePermissionsInSupamode,
          permissions: permissionsInSupamode,
        })
        .from(rolePermissionsInSupamode)
        .where(eq(rolePermissionsInSupamode.roleId, id))
        .innerJoin(
          permissionsInSupamode,
          eq(rolePermissionsInSupamode.permissionId, permissionsInSupamode.id),
        );

      // Get the role's permission groups
      const rolePermissionGroups = await tx
        .select({
          role_permission_groups: rolePermissionGroupsInSupamode,
          permission_groups: permissionGroupsInSupamode,
        })
        .from(rolePermissionGroupsInSupamode)
        .where(eq(rolePermissionGroupsInSupamode.roleId, id))
        .innerJoin(
          permissionGroupsInSupamode,
          eq(
            rolePermissionGroupsInSupamode.groupId,
            permissionGroupsInSupamode.id,
          ),
        );

      // Return the data in the expected format
      return {
        roles: [role],
        permissions: rolePermissions.map((rp) => rp.permissions),
        role_permissions: rolePermissions.map((rp) => rp.role_permissions),
        permission_groups: rolePermissionGroups.map(
          (rpg) => rpg.permission_groups,
        ),
        role_permission_groups: rolePermissionGroups.map(
          (rpg) => rpg.role_permission_groups,
        ),
      };
    });
  }

  /**
   * Create a new role
   * @param data - The data for the new role
   * @returns The created role
   */
  async createRole(data: typeof rolesInSupamode.$inferInsert) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .insert(rolesInSupamode)
        .values({
          name: data.name,
          description: data.description,
          rank: data.rank || 0,
          metadata: data.metadata ? data.metadata : {},
        })
        .returning();
    });
  }

  /**
   * Update a role
   * @param id - The ID of the role
   * @param data - The data for the update
   * @returns The updated role
   */
  async updateRole(id: string, data: typeof rolesInSupamode.$inferInsert) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .update(rolesInSupamode)
        .set({
          name: data.name,
          description: data.description,
          rank: data.rank,
          metadata: data.metadata,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(rolesInSupamode.id, id))
        .returning();
    });
  }

  /**
   * Delete a role
   * @param id - The ID of the role
   * @returns The deleted role
   */
  async deleteRole(id: string) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .delete(rolesInSupamode)
        .where(eq(rolesInSupamode.id, id))
        .returning();
    });
  }

  /**
   * Get all permissions
   */
  async getPermissions() {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .select()
        .from(permissionsInSupamode)
        .orderBy(permissionsInSupamode.name);
    });
  }

  /**
   * Get a permission by ID with related roles and groups
   * @param id - The ID of the permission
   * @returns The permission with related roles and groups
   */
  async getPermissionWithRelations(id: string) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      // Get permission
      const permission = await tx
        .select()
        .from(permissionsInSupamode)
        .where(eq(permissionsInSupamode.id, id))
        .limit(1)
        .then((data) => data[0]!);

      if (!permission) {
        throw new Error('Permission not found');
      }

      // Get roles using this permission
      const roles = await tx
        .select({
          id: rolesInSupamode.id,
          name: rolesInSupamode.name,
          description: rolesInSupamode.description,
          rank: rolesInSupamode.rank,
        })
        .from(rolePermissionsInSupamode)
        .innerJoin(
          rolesInSupamode,
          eq(rolePermissionsInSupamode.roleId, rolesInSupamode.id),
        )
        .where(eq(rolePermissionsInSupamode.permissionId, id));

      // Get groups using this permission
      const groups = await tx
        .select({
          id: permissionGroupsInSupamode.id,
          name: permissionGroupsInSupamode.name,
          description: permissionGroupsInSupamode.description,
        })
        .from(permissionGroupPermissionsInSupamode)
        .innerJoin(
          permissionGroupsInSupamode,
          eq(
            permissionGroupPermissionsInSupamode.groupId,
            permissionGroupsInSupamode.id,
          ),
        )
        .where(eq(permissionGroupPermissionsInSupamode.permissionId, id));

      return { permission, roles, groups };
    });
  }

  /**
   * Create a new permission
   * @param data - The data for the new permission
   * @returns The created permission
   */
  async createPermission(data: typeof permissionsInSupamode.$inferInsert) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .insert(permissionsInSupamode)
        .values({
          name: data.name,
          description: data.description,
          permissionType: data.permissionType,
          systemResource: data.systemResource,
          scope: data.scope,
          action: data.action,
          schemaName: data.schemaName,
          tableName: data.tableName,
          columnName: data.columnName,
          constraints: data.constraints,
          conditions: data.conditions,
          metadata: data.metadata,
        })
        .returning();
    });
  }

  /**
   * Update a permission
   * @param id - The ID of the permission
   * @param data - The data for the update
   * @returns The updated permission
   */
  async updatePermission(
    id: string,
    data: typeof permissionsInSupamode.$inferInsert,
  ) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .update(permissionsInSupamode)
        .set({
          name: data.name,
          description: data.description,
          permissionType: data.permissionType,
          scope: data.scope,
          action: data.action,
          schemaName: data.schemaName,
          systemResource: data.systemResource,
          tableName: data.tableName,
          columnName: data.columnName,
          constraints: data.constraints,
          conditions: data.conditions,
          metadata: data.metadata,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(permissionsInSupamode.id, id))
        .returning();
    });
  }

  /**
   * Delete a permission
   * @param id - The ID of the permission
   * @returns The deleted permission
   */
  async deletePermission(id: string) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .delete(permissionsInSupamode)
        .where(eq(permissionsInSupamode.id, id))
        .returning();
    });
  }

  /**
   * Get all permission groups
   * @returns The permission groups
   */
  async getPermissionGroups() {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .select()
        .from(permissionGroupsInSupamode)
        .orderBy(permissionGroupsInSupamode.name);
    });
  }

  /**
   * Get a permission group by ID
   * @param id - The ID of the permission group
   * @returns The permission group
   */
  async getPermissionGroup(id: string) {
    const client = await this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .select()
        .from(permissionGroupsInSupamode)
        .where(eq(permissionGroupsInSupamode.id, id))
        .limit(1)
        .then((data) => data[0]);
    });
  }

  /**
   * Get permissions for a role
   * @param roleId - The ID of the role
   * @returns The permissions for the role
   */
  async getRolePermissions(roleId: string) {
    const client = await this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .select({
          roleId: rolePermissionsInSupamode.roleId,
          permissionId: rolePermissionsInSupamode.permissionId,
          grantedAt: rolePermissionsInSupamode.grantedAt,
          validFrom: rolePermissionsInSupamode.validFrom,
          validUntil: rolePermissionsInSupamode.validUntil,
          conditions: rolePermissionsInSupamode.conditions,
          permission: {
            id: permissionsInSupamode.id,
            name: permissionsInSupamode.name,
            description: permissionsInSupamode.description,
            scope: permissionsInSupamode.scope,
            action: permissionsInSupamode.action,
          },
        })
        .from(rolePermissionsInSupamode)
        .innerJoin(
          permissionsInSupamode,
          eq(rolePermissionsInSupamode.permissionId, permissionsInSupamode.id),
        )
        .where(eq(rolePermissionsInSupamode.roleId, roleId));
    });
  }

  /**
   * Assign a permission to a role
   * @param data - The data for the assignment
   * @returns The assigned permission
   */
  async assignPermissionToRole(
    data: typeof rolePermissionsInSupamode.$inferInsert,
  ) {
    const client = await this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .insert(rolePermissionsInSupamode)
        .values({
          roleId: data.roleId,
          permissionId: data.permissionId,
          validFrom: data.validFrom,
          validUntil: data.validUntil,
          conditions: data.conditions,
        })
        .returning();
    });
  }

  /**
   * Remove a permission from a role
   * @param roleId - The ID of the role
   * @param permissionId - The ID of the permission
   * @returns The removed permission
   */
  async removePermissionFromRole(roleId: string, permissionId: string) {
    const client = await this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .delete(rolePermissionsInSupamode)
        .where(
          and(
            eq(rolePermissionsInSupamode.roleId, roleId),
            eq(rolePermissionsInSupamode.permissionId, permissionId),
          ),
        )
        .returning();
    });
  }

  /**
   * Get permission groups for a role
   * @param roleId - The ID of the role
   * @returns The permission groups for the role
   */
  async getRolePermissionGroups(roleId: string) {
    const client = await this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .select({
          roleId: rolePermissionGroupsInSupamode.roleId,
          groupId: rolePermissionGroupsInSupamode.groupId,
          assignedAt: rolePermissionGroupsInSupamode.assignedAt,
          validFrom: rolePermissionGroupsInSupamode.validFrom,
          validUntil: rolePermissionGroupsInSupamode.validUntil,
          group: {
            id: permissionGroupsInSupamode.id,
            name: permissionGroupsInSupamode.name,
            description: permissionGroupsInSupamode.description,
          },
        })
        .from(rolePermissionGroupsInSupamode)
        .innerJoin(
          permissionGroupsInSupamode,
          eq(
            rolePermissionGroupsInSupamode.groupId,
            permissionGroupsInSupamode.id,
          ),
        )
        .where(eq(rolePermissionGroupsInSupamode.roleId, roleId));
    });
  }

  /**
   * Assign a permission group to a role
   * @param params - The parameters for the assignment
   * @param params.roleId - The ID of the role
   * @param params.groupId - The ID of the permission group
   * @param params.validFrom - The valid from date
   * @param params.validUntil - The valid until date
   * @param params.metadata - The metadata for the assignment
   * @returns The assigned permission group
   */
  async assignPermissionGroupToRole(
    params: typeof rolePermissionGroupsInSupamode.$inferInsert,
  ) {
    const client = await this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      // Check if assignment already exists
      const existing = await tx
        .select()
        .from(rolePermissionGroupsInSupamode)
        .where(
          and(
            eq(rolePermissionGroupsInSupamode.roleId, params.roleId),
            eq(rolePermissionGroupsInSupamode.groupId, params.groupId),
          ),
        );

      if (existing.length > 0) {
        // Already assigned, just return the existing assignment
        return existing;
      }

      // Create the assignment
      return tx
        .insert(rolePermissionGroupsInSupamode)
        .values({
          roleId: params.roleId,
          groupId: params.groupId,
          assignedAt: new Date().toISOString(),
          validFrom: params.validFrom,
          validUntil: params.validUntil,
          metadata: params.metadata,
        })
        .returning();
    });
  }

  /**
   * Remove a permission group from a role
   * @param roleId - The ID of the role
   * @param groupId - The ID of the permission group
   * @returns The removed permission group
   */
  async removePermissionGroupFromRole(roleId: string, groupId: string) {
    const client = await this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .delete(rolePermissionGroupsInSupamode)
        .where(
          and(
            eq(rolePermissionGroupsInSupamode.roleId, roleId),
            eq(rolePermissionGroupsInSupamode.groupId, groupId),
          ),
        )
        .returning();
    });
  }

  /**
   * Get permissions for a permission group
   * @param groupId - The ID of the permission group
   * @returns The permissions for the permission group
   */
  async getPermissionGroupPermissions(groupId: string) {
    const client = await this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .select({
          groupId: permissionGroupPermissionsInSupamode.groupId,
          permissionId: permissionGroupPermissionsInSupamode.permissionId,
          addedAt: permissionGroupPermissionsInSupamode.addedAt,
          conditions: permissionGroupPermissionsInSupamode.conditions,
          permission: {
            id: permissionsInSupamode.id,
            name: permissionsInSupamode.name,
            description: permissionsInSupamode.description,
            scope: permissionsInSupamode.scope,
            action: permissionsInSupamode.action,
            permissionType: permissionsInSupamode.permissionType,
            schemaName: permissionsInSupamode.schemaName,
            tableName: permissionsInSupamode.tableName,
            columnName: permissionsInSupamode.columnName,
          },
        })
        .from(permissionGroupPermissionsInSupamode)
        .innerJoin(
          permissionsInSupamode,
          eq(
            permissionGroupPermissionsInSupamode.permissionId,
            permissionsInSupamode.id,
          ),
        )
        .where(eq(permissionGroupPermissionsInSupamode.groupId, groupId));
    });
  }

  /**
   * Batch update permissions for a permission group
   * Handles adding and removing multiple permissions in a single transaction
   * @param groupId - The ID of the permission group
   * @param updates - The updates to make
   * @param updates.toAdd - The permissions to add
   * @param updates.toRemove - The permissions to remove
   * @returns The success status
   */
  async batchUpdateGroupPermissions(
    groupId: string,
    updates: {
      toAdd: string[];
      toRemove: string[];
    },
  ) {
    const { toAdd, toRemove } = updates;
    const client = await this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      // Add new permissions
      if (toAdd.length > 0) {
        const values = toAdd.map((permissionId) => ({
          groupId,
          permissionId,
          addedAt: new Date().toISOString(),
        }));

        await tx
          .insert(permissionGroupPermissionsInSupamode)
          .values(values)
          .onConflictDoNothing(); // Skip if already exists
      }

      // Remove permissions
      if (toRemove.length > 0) {
        await tx
          .delete(permissionGroupPermissionsInSupamode)
          .where(
            and(
              eq(permissionGroupPermissionsInSupamode.groupId, groupId),
              inArray(
                permissionGroupPermissionsInSupamode.permissionId,
                toRemove,
              ),
            ),
          );
      }

      return { success: true };
    });
  }

  /**
   * Create a new permission group
   * @param data - The data for the new permission group
   * @param data.name - The name of the permission group
   * @param data.description - The description of the permission group
   * @returns The created permission group
   */
  async createPermissionGroup(data: { name: string; description?: string }) {
    const client = this.context.get('drizzle');

    // first, insert the permission group
    await client.runTransaction(async (tx) => {
      return tx.insert(permissionGroupsInSupamode).values({
        name: data.name,
        description: data.description,
      });
    });

    // then, get the permission group by name (unique constraint)
    return client.runTransaction(async (tx) => {
      const group = await tx
        .select({
          id: permissionGroupsInSupamode.id,
        })
        .from(permissionGroupsInSupamode)
        .where(eq(permissionGroupsInSupamode.name, data.name))
        .limit(1)
        .then((data) => data[0]);

      if (!group) {
        throw new Error(`Permission group not found with name: ${data.name}`);
      }

      return group;
    });
  }

  /**
   * Update a permission group
   * @param id - The ID of the permission group
   * @param data - The data for the update
   * @returns The updated permission group
   */
  async updatePermissionGroup(
    id: string,
    data: typeof permissionGroupsInSupamode.$inferInsert,
  ) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .update(permissionGroupsInSupamode)
        .set({
          name: data.name,
          description: data.description,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(permissionGroupsInSupamode.id, id))
        .returning();
    });
  }

  /**
   * Delete a permission group
   * @param id - The ID of the permission group
   * @returns The deleted permission group
   */
  async deletePermissionGroup(id: string) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .delete(permissionGroupsInSupamode)
        .where(eq(permissionGroupsInSupamode.id, id))
        .returning();
    });
  }

  /**
   * Get roles for a permission group
   * @param groupId - The ID of the permission group
   * @returns The roles for the permission group
   */
  async getPermissionGroupRoles(groupId: string) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .select({
          roleId: rolePermissionGroupsInSupamode.roleId,
          groupId: rolePermissionGroupsInSupamode.groupId,
          assignedAt: rolePermissionGroupsInSupamode.assignedAt,
          validFrom: rolePermissionGroupsInSupamode.validFrom,
          validUntil: rolePermissionGroupsInSupamode.validUntil,
          role: {
            id: rolesInSupamode.id,
            name: rolesInSupamode.name,
            description: rolesInSupamode.description,
            rank: rolesInSupamode.rank,
          },
        })
        .from(rolePermissionGroupsInSupamode)
        .innerJoin(
          rolesInSupamode,
          eq(rolePermissionGroupsInSupamode.roleId, rolesInSupamode.id),
        )
        .where(eq(rolePermissionGroupsInSupamode.groupId, groupId));
    });
  }

  /**
   * Get roles assigned to a member
   * @param memberId - The member/account ID
   * @returns An array of roles assigned to the member
   */
  async getMemberRoles(memberId: string) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx
        .select({
          id: rolesInSupamode.id,
          name: rolesInSupamode.name,
          description: rolesInSupamode.description,
          rank: rolesInSupamode.rank,
        })
        .from(accountRolesInSupamode)
        .innerJoin(
          rolesInSupamode,
          eq(accountRolesInSupamode.roleId, rolesInSupamode.id),
        )
        .where(eq(accountRolesInSupamode.accountId, memberId));
    });
  }
}
