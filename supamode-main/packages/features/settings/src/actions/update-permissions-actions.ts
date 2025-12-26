import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import {
  AssignPermissionToRoleRoute,
  AssignPermissionToRoleSchemaType,
  BatchUpdateRolePermissionGroupsRoute,
  BatchUpdateRolePermissionsRoute,
  CreatePermissionRoute,
  CreatePermissionSchemaType,
  CreateRoleRoute,
  CreateRoleSchemaType,
  DeletePermissionRoute,
  DeleteRoleRoute,
  RemovePermissionFromRoleRoute,
  UpdatePermissionRoute,
  UpdatePermissionSchemaType,
  UpdateRoleRoute,
  UpdateRoleSchemaType,
} from '../api/routes';

/**
 * Create a new role
 */
export async function createRoleAction(data: CreateRoleSchemaType) {
  const client = createHonoClient<CreateRoleRoute>();

  const response = await client['v1']['permissions']['roles'].$post({
    json: data,
  });

  return handleHonoClientResponse(response);
}

/**
 * Update an existing role
 */
export async function updateRoleAction(params: {
  id: string;
  data: UpdateRoleSchemaType;
}) {
  const client = createHonoClient<UpdateRoleRoute>();

  const response = await client['v1']['permissions']['roles'][':id'].$put({
    param: { id: params.id },
    json: params.data,
  });

  return handleHonoClientResponse(response);
}

/**
 * Delete a role
 */
export async function deleteRoleAction(id: string) {
  const client = createHonoClient<DeleteRoleRoute>();

  const response = await client['v1']['permissions']['roles'][':id'].$delete({
    param: { id },
  });

  return handleHonoClientResponse(response);
}

/**
 * Create a new permission
 */
export async function createPermissionAction(data: CreatePermissionSchemaType) {
  const client = createHonoClient<CreatePermissionRoute>();

  const response = await client['v1']['permissions'].$post({
    json: data,
  });

  return handleHonoClientResponse(response);
}

/**
 * Update an existing permission
 */
export async function updatePermissionAction(params: {
  id: string;
  data: UpdatePermissionSchemaType;
}) {
  const client = createHonoClient<UpdatePermissionRoute>();

  const response = await client['v1']['permissions'][':id'].$put({
    param: { id: params.id },
    json: params.data,
  });

  return handleHonoClientResponse(response);
}

/**
 * Delete a permission
 */
export async function deletePermissionAction(id: string) {
  const client = createHonoClient<DeletePermissionRoute>();

  const response = await client['v1']['permissions'][':id'].$delete({
    param: { id },
  });

  return handleHonoClientResponse(response);
}

/**
 * Assign a permission to a role
 */
export async function assignPermissionToRoleAction(params: {
  roleId: string;
  data: AssignPermissionToRoleSchemaType;
}) {
  const client = createHonoClient<AssignPermissionToRoleRoute>();

  const response = await client['v1']['permissions']['roles'][':roleId'][
    'permissions'
  ].$post({
    param: { roleId: params.roleId },
    json: params.data,
  });

  return handleHonoClientResponse(response);
}

/**
 * Remove a permission from a role
 */
export async function removePermissionFromRoleAction(params: {
  roleId: string;
  permissionId: string;
}) {
  const client = createHonoClient<RemovePermissionFromRoleRoute>();

  const response = await client['v1']['permissions']['roles'][':roleId'][
    'permissions'
  ][':permissionId'].$delete({
    param: {
      roleId: params.roleId,
      permissionId: params.permissionId,
    },
  });

  return handleHonoClientResponse(response);
}

/**
 * Batch update role permissions - add and remove multiple permissions in one call
 */
export async function batchUpdateRolePermissionsAction(params: {
  roleId: string;
  toAdd: string[];
  toRemove: string[];
}) {
  const client = createHonoClient<BatchUpdateRolePermissionsRoute>();

  const response = await client['v1']['permissions']['roles'][':id'][
    'batch-permissions'
  ].$patch({
    param: { id: params.roleId },
    json: {
      toAdd: params.toAdd,
      toRemove: params.toRemove,
    },
  });

  return handleHonoClientResponse(response);
}

/**
 * Batch update role permission groups
 */
export async function batchUpdateRolePermissionGroupsAction(params: {
  roleId: string;
  toAdd: string[];
  toRemove: string[];
}) {
  const client = createHonoClient<BatchUpdateRolePermissionGroupsRoute>();

  const response = await client['v1']['permissions']['roles'][':id'][
    'batch-permission-groups'
  ].$patch({
    param: { id: params.roleId },
    json: {
      toAdd: params.toAdd,
      toRemove: params.toRemove,
    },
  });

  return handleHonoClientResponse(response);
}
