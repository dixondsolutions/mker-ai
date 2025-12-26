import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { UpdateMemberRoleRoute } from '../api/routes';
import { UpdateMemberRoleSchema } from '../api/routes/types';

export type UpdateMemberRoleParams = {
  accountId: string;
  roleId: string;
};

/**
 * Update a member's role
 * @param params - The parameters for updating the member's role
 * @returns The response from the API
 */
export async function updateMemberRoleAction(params: UpdateMemberRoleParams) {
  const client = createHonoClient<UpdateMemberRoleRoute>();
  const json = UpdateMemberRoleSchema.parse(params);

  const response = await client['v1']['members']['role'].$put({
    json,
  });

  return handleHonoClientResponse(response);
}
