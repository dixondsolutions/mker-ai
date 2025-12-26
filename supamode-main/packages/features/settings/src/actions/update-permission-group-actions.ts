import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import {
  BatchUpdateGroupPermissionsRoute,
  CreatePermissionGroupRoute,
  CreatePermissionGroupSchemaType,
  DeletePermissionGroupRoute,
  UpdatePermissionGroupRoute,
  UpdatePermissionGroupSchemaType,
} from '../api/routes';

/**
 * Create a new permission group
 * @param data Permission group data
 * @returns Created permission group
 */
export async function createPermissionGroupAction(
  data: CreatePermissionGroupSchemaType,
) {
  const client = createHonoClient<CreatePermissionGroupRoute>();

  const response = await client['v1']['permissions']['groups'].$post({
    json: data,
  });

  return handleHonoClientResponse(response);
}

/**
 * Update an existing permission group
 * @param params Parameters for updating the permission group
 * @returns Updated permission group
 */
export async function updatePermissionGroupAction(params: {
  id: string;
  data: UpdatePermissionGroupSchemaType;
}) {
  const client = createHonoClient<UpdatePermissionGroupRoute>();
  const { id, data } = params;

  const response = await client['v1']['permissions']['groups'][':id'].$put({
    param: { id },
    json: data,
  });

  return handleHonoClientResponse(response);
}

/**
 * Delete a permission group
 * @param id Permission group ID
 * @returns Deleted permission group ID
 */
export async function deletePermissionGroupAction(id: string) {
  const client = createHonoClient<DeletePermissionGroupRoute>();

  const response = await client['v1']['permissions']['groups'][':id'].$delete({
    param: { id },
  });

  return handleHonoClientResponse(response);
}

/**
 * Update permissions for a permission group
 * @param params Parameters for updating group permissions
 * @returns Operation result
 */
export async function updatePermissionGroupPermissionsAction(params: {
  groupId: string;
  toAdd: string[];
  toRemove: string[];
}) {
  const client = createHonoClient<BatchUpdateGroupPermissionsRoute>();
  const { groupId, toAdd, toRemove } = params;

  const response = await client['v1']['permissions']['groups'][':id'][
    'permissions'
  ].$put({
    param: { id: groupId },
    json: { toAdd, toRemove },
  });

  return handleHonoClientResponse(response);
}
