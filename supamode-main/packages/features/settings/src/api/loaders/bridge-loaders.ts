import { memberAuditLogsLoader } from '@kit/audit-logs/loaders';
import { createLoader } from '@kit/shared/router-query-bridge';
import { userContext } from '@kit/supabase/provider';

import {
  memberDetailsLoader,
  membersLoader,
  permissionDetailsLoader,
  permissionGroupPermissionsLoader,
  permissionsLoader,
  rolePermissionsLoader,
  tableMetadataLoader,
  tablesMetadataLoader,
} from '../../loaders';

/**
 * Query key factory for settings
 */
export const settingsQueryKeys = {
  all: ['settings'] as const,
  account: () => [...settingsQueryKeys.all, 'account'] as const,
  members: (search?: string, page?: number) =>
    [...settingsQueryKeys.all, 'members', { search, page }] as const,
  memberDetails: (id: string) =>
    [...settingsQueryKeys.all, 'member-details', id] as const,
  memberAuditLogs: (userId: string, page?: number) =>
    [...settingsQueryKeys.all, 'member-audit-logs', userId, { page }] as const,
  permissions: () => [...settingsQueryKeys.all, 'permissions'] as const,
  rolePermissions: (roleId: string) =>
    [...settingsQueryKeys.all, 'role-permissions', roleId] as const,
  permissionGroupPermissions: (groupId: string) =>
    [
      ...settingsQueryKeys.all,
      'permission-group-permissions',
      groupId,
    ] as const,
  permissionDetails: (id: string) =>
    [...settingsQueryKeys.all, 'permission-details', id] as const,
  tablesMetadata: () => [...settingsQueryKeys.all, 'tables-metadata'] as const,
  tableMetadata: (schema: string, table: string) =>
    [...settingsQueryKeys.all, 'table-metadata', schema, table] as const,
  mfaConfiguration: () =>
    [...settingsQueryKeys.all, 'mfa-configuration'] as const,
};
/**
 * Bridge-powered loader for MFA configuration
 * Short stale time for security-sensitive data
 */
export const mfaConfigurationBridgeLoader = createLoader({
  queryKey: settingsQueryKeys.mfaConfiguration(),
  queryFn: async () => {
    try {
      const { mfaConfigurationLoader } = await import(
        '../../loaders/mfa-configuration-loader'
      );
      const mfaConfig = await mfaConfigurationLoader();

      return {
        mfa: {
          ...mfaConfig.data,
          canManageMfa: mfaConfig.data.hasPermissionToUpdateMFA,
          userHasMFAEnabled: mfaConfig.data.userHasMFAEnabled,
        },
      };
    } catch (error) {
      console.error(error);
      // If user doesn't have permission or there's an error, don't show MFA settings
      return {
        mfa: {
          requiresMfa: false,
          userHasMFAEnabled: false,
          hasPermissionToUpdateMFA: false,
        },
      };
    }
  },
  staleTime: 10 * 1000, // 10 seconds - security settings should be very fresh
});

/**
 * Bridge-powered loader for members data
 * Short stale time for frequently changing data
 */
export const membersBridgeLoader = createLoader({
  queryKey: ({ request }) => {
    const urlParams = new URL(request.url).searchParams;
    const search = urlParams.get('search') ?? '';
    const page = parseInt(urlParams.get('page') ?? '1', 10);

    return settingsQueryKeys.members(search, page);
  },
  queryFn: async ({ request, context }) => {
    const user = context.get(userContext);
    const urlParams = new URL(request.url).searchParams;
    const search = urlParams.get('search') ?? '';
    const page = parseInt(urlParams.get('page') ?? '1', 10);

    const data = await membersLoader({ search, page });

    return {
      ...data,
      search,
      user,
    };
  },
  staleTime: 15 * 1000, // 15 seconds - member data changes frequently
});

/**
 * Bridge-powered loader for member details
 * Short stale time for user-specific data
 */
export const memberDetailsBridgeLoader = createLoader({
  queryKey: ({ params }) => {
    const userId = params['id'] as string;
    return settingsQueryKeys.memberDetails(userId);
  },
  queryFn: async ({ params, context, request }) => {
    const currentUser = context.get(userContext);
    const urlParams = new URL(request.url).searchParams;
    const cursor = urlParams.get('cursor') ?? undefined;
    const userId = params['id'] as string;

    const dataPromise = memberDetailsLoader(userId);
    const logsPromise = memberAuditLogsLoader({
      userId,
      cursor,
    });

    const [data, logs] = await Promise.all([dataPromise, logsPromise]);

    return {
      ...data,
      currentUser,
      logs,
    };
  },
  staleTime: 10 * 1000, // 10 seconds - user details should be fresh
});

/**
 * Bridge-powered loader for permissions
 * Short stale time for security-sensitive data
 */
export const permissionsBridgeLoader = createLoader({
  queryKey: settingsQueryKeys.permissions(),
  queryFn: async () => {
    return permissionsLoader();
  },
  staleTime: 15 * 1000, // 15 seconds - permissions should be fresh
});

/**
 * Bridge-powered loader for role permissions
 * Short stale time for security-sensitive data
 */
export const rolePermissionsBridgeLoader = createLoader({
  queryKey: ({ params }) => {
    const roleId = params['id'] as string;
    return settingsQueryKeys.rolePermissions(roleId);
  },
  queryFn: async ({ params }) => {
    const roleId = params['id'] as string;
    return rolePermissionsLoader(roleId);
  },
  staleTime: 10 * 1000, // 10 seconds - role permissions should be very fresh
});

/**
 * Bridge-powered loader for permission group permissions
 * Short stale time for security-sensitive data
 */
export const permissionGroupPermissionsBridgeLoader = createLoader({
  queryKey: ({ params }) => {
    const groupId = params['id'] as string;
    return settingsQueryKeys.permissionGroupPermissions(groupId);
  },
  queryFn: async ({ params }) => {
    const groupId = params['id'] as string;
    return permissionGroupPermissionsLoader(groupId);
  },
  staleTime: 10 * 1000, // 10 seconds - permission group data should be very fresh
});

/**
 * Bridge-powered loader for permission details
 * Short stale time for security-sensitive data
 */
export const permissionDetailsBridgeLoader = createLoader({
  queryKey: ({ params }) => {
    const permissionId = params['id'] as string;
    return settingsQueryKeys.permissionDetails(permissionId);
  },
  queryFn: async ({ params }) => {
    const permissionId = params['id'] as string;
    return permissionDetailsLoader(permissionId);
  },
  staleTime: 10 * 1000, // 10 seconds - permission details should be very fresh
});

/**
 * Bridge-powered loader for tables metadata
 * Short stale time for configuration data
 */
export const tablesMetadataBridgeLoader = createLoader({
  queryKey: settingsQueryKeys.tablesMetadata(),
  queryFn: async () => {
    return tablesMetadataLoader();
  },
  staleTime: 20 * 1000, // 20 seconds - table metadata changes less frequently
});

/**
 * Bridge-powered loader for table metadata
 * Short stale time for configuration data
 */
export const tableMetadataBridgeLoader = createLoader({
  queryKey: ({ params }) => {
    const schema = params['schema'] as string;
    const table = params['table'] as string;

    return settingsQueryKeys.tableMetadata(schema, table);
  },
  queryFn: async ({ params }) => {
    const schema = params['schema'] as string;
    const table = params['table'] as string;

    return tableMetadataLoader({ schema, table });
  },
  staleTime: 20 * 1000, // 20 seconds - table metadata changes less frequently
});

/**
 * Bridge-powered loader for authentication settings
 * Gets user context for authentication settings
 */
export const authenticationBridgeLoader = createLoader({
  queryKey: ({ context }) => {
    const user = context.get(userContext);
    return [...settingsQueryKeys.all, 'authentication', user?.id] as const;
  },
  queryFn: async ({ context }) => {
    const user = context.get(userContext);
    return {
      userId: user?.id,
    };
  },
  staleTime: 30 * 1000, // 30 seconds - authentication settings are more static
});
