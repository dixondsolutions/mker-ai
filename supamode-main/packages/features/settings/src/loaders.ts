import { redirect } from 'react-router';

import { createHonoClient, handleHonoClientResponse } from '@kit/api';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

import type {
  GetAccountRoute,
  GetAllPermissionsWithStatusRoute,
  GetMemberDetailsRoute,
  GetMembersRoute,
  GetPermissionDetailsRoute,
  GetPermissionGroupPermissionsRoute,
  GetPermissionsRoute,
  GetRolePermissionsRoute,
  GetTableMetadataRoute,
  GetTablesMetadataRoute,
} from './api/routes';

/**
 * Load the managed tables
 * @returns
 */
export async function tablesMetadataLoader() {
  const client = createHonoClient<GetTablesMetadataRoute>();
  const response = await client['v1']['settings']['resources'].$get();

  if (!response.ok) {
    throw new Error(`Failed to load managed tables: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Load the managed table details
 * @param params - The parameters for loading the managed table details
 */
export async function tableMetadataLoader(params: {
  table: string;
  schema: string;
}) {
  const client = createHonoClient<GetTableMetadataRoute>();

  const response = await client['v1']['settings']['resources'][':schema'][
    ':table'
  ].$get({
    param: params,
  });

  return handleHonoClientResponse(response);
}

/**
 * Load members data
 */
export async function membersLoader(props: { search?: string; page?: number }) {
  const client = createHonoClient<GetMembersRoute>();

  const response = await client['v1']['members'].$get({
    query: {
      search: props.search,
      page: props.page?.toString() || '1',
    },
  });

  return handleHonoClientResponse(response);
}

/**
 * Load member details
 * @param id - The member ID
 */
export async function memberDetailsLoader(id: string) {
  const client = createHonoClient<GetMemberDetailsRoute>();

  const response = await client['v1']['members'][':id'].$get({
    param: { id },
  });

  return handleHonoClientResponse(response);
}

/**
 * Load permissions data
 */
export async function permissionsLoader() {
  const client = createHonoClient<GetPermissionsRoute>();
  const response = await client['v1']['permissions'].$get();

  return handleHonoClientResponse(response);
}

/**
 * Load role permissions data
 * @param roleId - The role ID
 */
export async function rolePermissionsLoader(roleId: string) {
  const client = createHonoClient<GetRolePermissionsRoute>();

  const response = await client['v1']['permissions']['roles'][':id'].$get({
    param: { id: roleId },
  });

  return handleHonoClientResponse(response);
}

/**
 * Load permission group permissions data
 * @param groupId - The permission group ID
 */
export async function permissionGroupPermissionsLoader(groupId: string) {
  const client = createHonoClient<GetPermissionGroupPermissionsRoute>();

  const response = await client['v1']['permissions']['groups'][':id'].$get({
    param: { id: groupId },
  });

  return handleHonoClientResponse(response);
}

/**
 * Load all permissions with assignment status data
 * @param roleId - The role ID
 */
export async function allPermissionsWithStatusLoader(roleId: string) {
  const client = createHonoClient<GetAllPermissionsWithStatusRoute>();

  const response = await client['v1']['permissions']['roles'][':id'][
    'all'
  ].$get({
    param: { id: roleId },
  });

  return handleHonoClientResponse(response);
}

/**
 * Load permission details data
 * @param permissionId - The permission ID
 */
export async function permissionDetailsLoader(permissionId: string) {
  const client = createHonoClient<GetPermissionDetailsRoute>();

  const response = await client['v1']['permissions'][':id'].$get({
    param: { id: permissionId },
  });

  return handleHonoClientResponse(response);
}

/**
 * Load all permission groups with assignment status for a role
 * @param roleId - The role ID
 */
export async function allPermissionGroupsWithStatusLoader(roleId: string) {
  // This would call the Hono client endpoint for fetching all permission groups with status
  // For now, as a placeholder until the API endpoint is implemented
  const allGroups = await permissionsLoader();
  const roleGroups = (await rolePermissionsLoader(roleId)).permission_groups;

  const assignedGroupIds = new Set(roleGroups.map((g) => g.id));

  // Combine all groups with assignment status
  const permissionGroups = allGroups.permissionGroups.map((group) => ({
    ...group,
    isAssigned: assignedGroupIds.has(group.id),
  }));

  return {
    permissionGroups,
  };
}

/**
 * Load account preferences
 */
export async function accountLoader() {
  const client = createHonoClient<GetAccountRoute>();
  const response = await client['v1']['account'].$get();

  if (response.status === 403) {
    const client = getSupabaseBrowserClient();
    await client.auth.signOut();

    throw redirect('/auth/sign-in');
  }

  return handleHonoClientResponse(response);
}
