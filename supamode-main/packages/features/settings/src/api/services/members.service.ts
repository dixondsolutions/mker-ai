import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';
import { Context } from 'hono';

import { getDrizzleSupabaseAdminClient } from '@kit/supabase/client';
import {
  accountRolesInSupamode,
  accountsInSupamode,
  rolesInSupamode,
} from '@kit/supabase/schema';

/**
 * Creates a MembersService instance.
 */
export function createMembersService(c: Context) {
  return new MembersService(c);
}

/**
 * @name MembersService
 * @description Service for managing account members and roles
 */
class MembersService {
  constructor(private readonly context: Context) {}

  /**
   * Get all accounts with their roles
   * @param props - The properties for the query
   * @param props.page - The page number
   * @param props.limit - The number of members to return
   * @param props.search - The search query
   * @returns The members with their roles and pagination metadata
   */
  async getMembers(props: { page: number; limit: number; search?: string }) {
    const client = this.context.get('drizzle');
    const adminClient = getDrizzleSupabaseAdminClient();

    return client.runTransaction(async (tx) => {
      const conditions = props.search
        ? like(
            sql`CONCAT(
            COALESCE(${accountsInSupamode.metadata}->>'display_name', ''),
            ' ',
            COALESCE(${accountsInSupamode.metadata}->>'email', '')
          )`,
            `%${props.search}%`,
          )
        : undefined;

      // Build the base query for counting total records
      const totalCountQuery = tx
        .select({ count: sql`count(*)` })
        .from(accountsInSupamode)
        .where(conditions);

      // Get total count
      const totalCountResult = await totalCountQuery;
      const total = Number(totalCountResult[0]?.count) || 0;

      // Calculate pagination metadata
      const pageSize = props.limit;
      const pageIndex = props.page - 1; // Convert to 0-based index
      const pageCount = Math.ceil(total / pageSize);

      // Query accounts with their roles
      const accountsWithRolesQuery = tx
        .select({
          account: {
            id: accountsInSupamode.id,
            authUserId: accountsInSupamode.authUserId,
            createdAt: accountsInSupamode.createdAt,
            updatedAt: accountsInSupamode.updatedAt,
            metadata: accountsInSupamode.metadata,
            isActive: accountsInSupamode.isActive,
          },
        })
        .from(accountsInSupamode)
        .orderBy(desc(accountsInSupamode.createdAt))
        .limit(props.limit)
        .offset((props.page - 1) * props.limit);

      if (props.search) {
        accountsWithRolesQuery.where(
          like(
            sql`CONCAT(
              COALESCE(${accountsInSupamode.metadata}->>'display_name', ''),
              ' ',
              COALESCE(${accountsInSupamode.metadata}->>'email', '')
            )`,
            `%${props.search}%`,
          ),
        );
      }

      const accountsWithRoles = await accountsWithRolesQuery;

      // For each account, get their roles
      const data = await Promise.all(
        accountsWithRoles.map(async ({ account }) => {
          const userRoles = await tx
            .select({
              role: {
                id: rolesInSupamode.id,
                name: rolesInSupamode.name,
                description: rolesInSupamode.description,
                rank: rolesInSupamode.rank,
              },
              assignedAt: accountRolesInSupamode.assignedAt,
            })
            .from(accountRolesInSupamode)
            .innerJoin(
              rolesInSupamode,
              eq(accountRolesInSupamode.roleId, rolesInSupamode.id),
            )
            .where(eq(accountRolesInSupamode.accountId, account.id));

          // Get user profile data from metadata
          const metadata = (account.metadata as Record<string, unknown>) || {};
          let displayName = metadata['display_name'];

          const pictureUrl = (metadata['picture_url'] || null) as string | null;
          const email = (metadata['email'] || null) as string | null;

          if (!displayName) {
            const users = await adminClient.execute(
              sql`SELECT * FROM auth.users WHERE id = ${account.authUserId}`,
            );

            const user = users[0] as {
              email: string;
            };

            if (user) {
              displayName = user.email;
            } else {
              displayName = '-';
            }
          }

          return {
            account,
            displayName,
            email,
            pictureUrl,
            roles: userRoles,
            highestRoleRank: userRoles.length
              ? Math.max(...userRoles.map((r) => r.role.rank || 0))
              : 0,
          };
        }),
      );

      return {
        data,
        pageSize,
        pageIndex,
        pageCount,
        total,
      };
    });
  }

  /**
   * Get member details
   * @param id - The member ID
   * @returns The member details
   */
  async getMemberDetails(id: string) {
    const client = this.context.get('drizzle');
    const adminClient = getDrizzleSupabaseAdminClient();

    return client.runTransaction(async (tx) => {
      // First, get the account details
      const account = await tx
        .select()
        .from(accountsInSupamode)
        .where(eq(accountsInSupamode.id, id))
        .limit(1)
        .then((res) => res[0]);

      if (!account) {
        throw new Error('Member not found');
      }

      // Get user details from auth
      const user = await adminClient.execute(
        sql`SELECT * FROM auth.users WHERE id = ${account.authUserId}`,
      );

      if (!user[0]) {
        throw new Error('User not found');
      }

      // Get roles assigned to the account
      const accountRoles = await tx
        .select({
          id: rolesInSupamode.id,
          name: rolesInSupamode.name,
          description: rolesInSupamode.description,
          rank: rolesInSupamode.rank,
          validFrom: accountRolesInSupamode.validFrom,
          validUntil: accountRolesInSupamode.validUntil,
          assignedAt: accountRolesInSupamode.assignedAt,
          assignedBy: accountRolesInSupamode.assignedBy,
          updatedAt: rolesInSupamode.updatedAt,
          createdAt: rolesInSupamode.createdAt,
          metadata: rolesInSupamode.metadata,
        })
        .from(accountRolesInSupamode)
        .innerJoin(
          rolesInSupamode,
          eq(accountRolesInSupamode.roleId, rolesInSupamode.id),
        )
        .where(eq(accountRolesInSupamode.accountId, id));

      return {
        account,
        roles: accountRoles,
        user: {
          id: user[0]['id'],
          email: user[0]['email'],
        },
      };
    });
  }

  /**
   * Update a member's role
   * @param params - The parameters for the update
   * @param params.accountId - The account ID
   * @param params.roleId - The role ID
   * @returns The updated role
   */
  async updateMemberRole(params: { accountId: string; roleId: string }) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      // Check if the role assignment already exists
      const existingRole = await tx
        .select()
        .from(accountRolesInSupamode)
        .where(
          and(
            eq(accountRolesInSupamode.accountId, params.accountId),
            eq(accountRolesInSupamode.roleId, params.roleId),
          ),
        )
        .limit(1);

      // If the role is already assigned, return it
      if (existingRole.length > 0) {
        return existingRole[0];
      }

      // Upsert the new role assignment
      return tx
        .insert(accountRolesInSupamode)
        .values({
          accountId: params.accountId,
          roleId: params.roleId,
          assignedAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: accountRolesInSupamode.accountId,
          set: {
            roleId: params.roleId,
            assignedAt: new Date().toISOString(),
            validFrom: new Date().toISOString(),
          },
        })
        .returning();
    });
  }

  /**
   * Update member roles with batch operations
   * @param memberId - The member account ID
   * @param updates - The roles to add and remove
   * @returns The success status
   */
  async updateMemberRoles(
    memberId: string,
    updates: {
      rolesToAdd: string[];
      rolesToRemove: string[];
    },
  ) {
    const { rolesToAdd, rolesToRemove } = updates;
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      // Add new roles
      if (rolesToAdd.length > 0) {
        const values = rolesToAdd.map((roleId) => ({
          accountId: memberId,
          roleId,
          assignedAt: new Date().toISOString(),
        }));

        await tx
          .insert(accountRolesInSupamode)
          .values(values)
          .onConflictDoNothing(); // Skip if already exists
      }

      // Remove roles
      if (rolesToRemove.length > 0) {
        await tx
          .delete(accountRolesInSupamode)
          .where(
            and(
              eq(accountRolesInSupamode.accountId, memberId),
              inArray(accountRolesInSupamode.roleId, rolesToRemove),
            ),
          );
      }
    });
  }

  /**
   * Deactivate a member
   * @param id - The member ID
   * @returns The success status
   */
  async deactivateMember(id: string) {
    const adminClient = getDrizzleSupabaseAdminClient();
    const canUpdateMember = await this.canActionAccount(id, 'update');

    if (!canUpdateMember) {
      throw new Error('You are not authorized to update this member');
    }

    return adminClient
      .update(accountsInSupamode)
      .set({ isActive: false })
      .where(eq(accountsInSupamode.id, id));
  }

  /**
   * Activate a member
   * @param id - The member ID
   * @returns The success status
   */
  async activateMember(id: string) {
    const adminClient = getDrizzleSupabaseAdminClient();
    const canUpdateMember = await this.canActionAccount(id, 'update');

    if (!canUpdateMember) {
      throw new Error('You are not authorized to update this member');
    }

    return adminClient
      .update(accountsInSupamode)
      .set({ isActive: true })
      .where(eq(accountsInSupamode.id, id));
  }

  /**
   * Update a member's account
   * @param id - The member ID
   * @param data - The account data to update
   * @returns The success status
   */
  async updateAccount(
    id: string,
    data: { displayName: string; email: string },
  ) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      await tx
        .update(accountsInSupamode)
        .set({
          metadata: {
            display_name: data.displayName,
            email: data.email,
          },
        })
        .where(eq(accountsInSupamode.id, id));
    });
  }
  /**
   * Get account by auth user ID
   * @param authUserId - The auth user ID
   * @returns The account details
   */
  async getAccountByAuthId(authUserId: string) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return await tx
        .select()
        .from(accountsInSupamode)
        .where(eq(accountsInSupamode.authUserId, authUserId))
        .limit(1)
        .then((res) => res[0]);
    });
  }

  /**
   * Check if the current user can perform an action on an account
   * @param id - The account ID
   * @param action - The action to check
   * @returns True if the user can perform the action, false otherwise
   */
  private async canActionAccount(id: string, action: 'update' | 'delete') {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      const result = await tx.execute(
        sql`select supamode.can_action_account(${id}, ${action}) as can_action`,
      );

      return result[0]?.['can_action'] === true;
    });
  }
}
