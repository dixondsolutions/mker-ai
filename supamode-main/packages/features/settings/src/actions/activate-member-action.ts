import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { ActivateMemberRoute } from '../api/routes';

/**
 * Activate a member
 * @param accountId - The account ID of the member to activate
 * @returns The response from the API
 */
export async function activateMemberAction(accountId: string) {
  const client = createHonoClient<ActivateMemberRoute>();

  const response = await client['v1']['members'][':id']['activate']['$post']({
    param: {
      id: accountId,
    },
  });

  return handleHonoClientResponse(response);
}
