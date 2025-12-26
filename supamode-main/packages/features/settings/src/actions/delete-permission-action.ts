import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { DeletePermissionRoute } from '../api/routes';

/**
 * Delete permission action
 * @param permissionId - The permission ID to delete
 * @returns A promise that resolves to the deleted permission
 */
export async function deletePermissionAction(permissionId: string) {
  const client = createHonoClient<DeletePermissionRoute>();

  const response = await client['v1']['permissions'][':id'].$delete({
    param: { id: permissionId },
  });

  return handleHonoClientResponse(response);
}
