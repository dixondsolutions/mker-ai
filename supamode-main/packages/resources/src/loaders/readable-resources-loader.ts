import { createHonoClient } from '@kit/api';

import { GetReadableResourcesRoute } from '../api/routes';

/**
 * Load the readable resources for the current user
 * @returns The readable resources
 */
export async function readableResourcesLoader() {
  const client = createHonoClient<GetReadableResourcesRoute>();

  const data = await client['v1']['resources'].$get();

  return data.json();
}
