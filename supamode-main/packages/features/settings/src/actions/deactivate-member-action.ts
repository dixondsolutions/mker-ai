import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { DeactivateMemberRoute } from '../api/routes';

/**
 * Deactivate a member
 * @param accountId - The account ID of the member to deactivate
 * @returns The response from the API
 */
export async function deactivateMemberAction(accountId: string) {
  const client = createHonoClient<DeactivateMemberRoute>();

  const response = await client['v1']['members'][':id']['deactivate']['$post']({
    param: {
      id: accountId,
    },
  });

  return handleHonoClientResponse(response);
}
