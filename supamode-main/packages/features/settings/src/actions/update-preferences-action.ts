import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { UpdatePreferencesRoute } from '../api/routes';

/**
 * Update the preferences of the current user
 * @param data
 * @returns
 */
export async function updatePreferencesAction(data: {
  language?: string;
  timezone?: string;
}) {
  const client = createHonoClient<UpdatePreferencesRoute>();

  const response = await client['v1']['account']['preferences']['$post']({
    json: data,
  });

  return handleHonoClientResponse(response);
}
