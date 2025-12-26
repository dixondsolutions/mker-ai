import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { createPermissionsService } from '@kit/permissions/services';
import { getLogger } from '@kit/shared/logger';
import { getErrorMessage } from '@kit/shared/utils';

/**
 * Register the roles router
 * @param router - The router to register the route on
 * @returns The router with the route registered
 */
export function registerRolesRouter(router: Hono) {
  registerGetRolesWithStatusForMemberRoute(router);

  return router;
}

/**
 * Register the get roles with assignment status for a member route
 * @param router - The router to register the route on
 * @returns The router with the route registered
 */
function registerGetRolesWithStatusForMemberRoute(router: Hono) {
  return router.get(
    '/v1/members/:id/roles/all',
    zValidator('param', z.object({ id: z.string().uuid() })),
    async (c) => {
      const memberId = c.req.param('id');
      const service = createPermissionsService(c);
      const logger = await getLogger();

      try {
        // Get all roles
        const allRoles = await service.getRoles();

        // Get roles assigned to the member
        const memberRoles = await service.getMemberRoles(memberId);

        // Create a set of assigned role IDs for quick lookup
        const assignedRoleIds = new Set(memberRoles.map((role) => role.id));

        // Mark roles as assigned or not
        const rolesWithStatus = allRoles.map((role) => ({
          ...role,
          isAssigned: assignedRoleIds.has(role.id),
        }));

        return c.json({
          roles: rolesWithStatus,
        });
      } catch (error) {
        logger.error(
          {
            error,
          },
          'Error fetching roles with status for member',
        );

        return c.json({ error: getErrorMessage(error) }, 500);
      }
    },
  );
}

export type GetRolesWithStatusForMemberRoute = ReturnType<
  typeof registerGetRolesWithStatusForMemberRoute
>;
