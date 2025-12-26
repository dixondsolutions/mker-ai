import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import process from 'node:process';

import {
  registerAuditLogDetailsRoute,
  registerAuditLogsRoute,
  registerMemberAuditLogsRoute,
} from '@kit/audit-logs/routes';
import { registerAuthMiddleware } from '@kit/auth/routes';
import { createAuthorizationService } from '@kit/auth/services';
import { registerCaptchaMiddleware } from '@kit/captcha/server';
import { registerDashboardRoutes } from '@kit/dashboards/routes';
import { registerDataExplorerRoutes } from '@kit/data-explorer/routes';
import { registerNavigationRoutes } from '@kit/navigation/routes';
import { registerPermissionsRoutes } from '@kit/permissions/routes';
import { registerResourcesRoutes } from '@kit/resources/routes';
import {
  registerActivateMemberRouter,
  registerDeactivateMemberRouter,
  registerGetAccountRoute,
  registerGetMemberDetailsRouter,
  registerGetMembersRouter,
  registerMfaConfigurationRouter,
  registerPermissionGroupEndpoints,
  registerPermissionsRouter,
  registerSaveLayoutRouter,
  registerSyncManagedTablesRouter,
  registerTablesMetadataManagementRouter,
  registerUpdateAccountRouter,
  registerUpdateMemberRoleRouter,
  registerUpdateMemberRolesRouter,
  registerUpdatePermissionsRouter,
  registerUpdatePreferencesRouter,
  registerUpdateTableColumnsConfigRouter,
  registerUpdateTableMetadataRouter,
  registerUpdateTablesRouter,
} from '@kit/settings/routes';
import {
  registerBucketContentsRouter,
  registerFileOperationsRouter,
  registerStorageBucketsRouter,
} from '@kit/storage-explorer/routes';
import { getDrizzleSupabaseClient } from '@kit/supabase/client';
import { getSupabaseClient } from '@kit/supabase/hono';
import { registerUsersExplorerRoutes } from '@kit/users-explorer/routes';

import packageJson from '../../../package.json' with { type: 'json' };

/**
 * @name router
 * @description The router for the API
 */
const router = new Hono();

// register version endpoint for client/server sync checking
router.get('/v1/version', (c) => {
  return c.json({ version: packageJson.version });
});

// register the health check endpoint
router.get('/v1/health', (c) => {
  return c.json({ status: 'ok' });
});

/**
 * @name origins
 * @description The origins for the API. This is used to enable CORS.
 */
const origins = [process.env['APP_URL']!].filter(Boolean) as string[];

/**
 * Set up secure headers
 */
router.use(secureHeaders());

/**
 * Enable compression for the API responses.
 * Cannot use in Bun (yet)
 */
if (!process.versions['bun']) {
  router.use(compress());
}

/**
 * Enable logging for the API requests
 */
router.use(logger());

// enable CORS
router.use(
  cors({
    origin: origins,
    credentials: true,
  }),
);

// enable CSRF protection
router.use(
  csrf({
    origin: origins,
  }),
);

// add Supabase, Drizzle, and Authorization services to the context
router.use('/v1/*', async (c, next) => {
  try {
    // set the Supabase client in the context
    c.set('supabase', getSupabaseClient(c));

    // set the Drizzle client in the context
    const drizzle = await getDrizzleSupabaseClient(c);

    c.set('drizzle', drizzle);

    // initialize the authorization service after auth middleware has run
    // this ensures the JWT context is properly set up
    try {
      c.set('authorization', createAuthorizationService(c));
    } catch (authError) {
      console.error('Failed to initialize authorization service:', authError);
      // Fail closed - do not proceed without proper authorization
      return c.json(
        {
          error: 'Authorization service initialization failed',
          message: 'Unable to verify permissions for this request',
        },
        500,
      );
    }

    await next();
  } catch (error) {
    console.error('Request processing failed:', error);

    return c.json(
      {
        error: 'Internal server error',
        message: 'Request could not be processed',
      },
      500,
    );
  }
});

/**
 * @name onError
 * @description The error handler for the API
 */
router.onError((err, c) => {
  console.error(err);

  return c.json({ error: 'Internal server error' }, 500);
});

// register captcha middleware, hit before auth middleware
registerCaptchaMiddleware(router);

// register the authentication middleware
registerAuthMiddleware(router);

// register the consolidated permissions and roles routes
registerPermissionsRoutes(router);

// register the routes for the database editor
registerDataExplorerRoutes(router);

// register the routes for dashboards
registerDashboardRoutes(router);

// register the routes for navigation
registerNavigationRoutes(router);

// register the routes for resources
registerResourcesRoutes(router);

// register the routes for updating table metadata
registerUpdateTablesRouter(router);

// register the routes for syncing managed tables
registerSyncManagedTablesRouter(router);

// register the routes for updating table metadata
registerTablesMetadataManagementRouter(router);

// register the routes for saving layout
registerSaveLayoutRouter(router);

// register the routes for updating table metadata
registerUpdateTableMetadataRouter(router);

// register the routes for members management
registerGetMembersRouter(router);

// register the routes for member details
registerGetMemberDetailsRouter(router);

// register the routes for updating member roles
registerUpdateMemberRolesRouter(router);

// register the routes for deactivating member
registerDeactivateMemberRouter(router);

// register the routes for activating member
registerActivateMemberRouter(router);

// register the routes for updating member role
registerUpdateMemberRoleRouter(router);

// register the routes for permissions
registerPermissionsRouter(router);

// register the routes for updating permissions
registerUpdatePermissionsRouter(router);

// register the routes for permission groups
registerPermissionGroupEndpoints(router);

// register the routes for MFA configuration
registerMfaConfigurationRouter(router);

// register the routes for updating account
registerUpdateAccountRouter(router);

// register the routes for updating table columns config
registerUpdateTableColumnsConfigRouter(router);

// register the routes for audit logs
registerAuditLogsRoute(router);

// register the routes for audit log details
registerAuditLogDetailsRoute(router);

// register the routes for member audit logs
registerMemberAuditLogsRoute(router);

// register the routes for users explorer
registerUsersExplorerRoutes(router);

// register the routes for updating preferences
registerUpdatePreferencesRouter(router);

// register the routes for getting the account
registerGetAccountRoute(router);

// register the routes for storage explorer
registerStorageBucketsRouter(router);
registerBucketContentsRouter(router);
registerFileOperationsRouter(router);

export default router;
