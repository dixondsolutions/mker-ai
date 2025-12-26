import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { UpdateAccountRoute } from '../api/routes';

/**
 * Update a member's account
 * @returns The response from the API
 */
export async function updateAccountAction(
  accountId: string,
  data: {
    displayName: string;
    email: string;
  },
) {
  const client = createHonoClient<UpdateAccountRoute>();

  const response = await client['v1']['members'][':id']['$put']({
    param: {
      id: accountId,
    },
    json: data,
  });

  return handleHonoClientResponse(response);
}
