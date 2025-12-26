import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { GetStorageBucketsRoute } from '../routes';

/**
 * Load storage buckets data
 * @returns The response from the server
 */
export async function storageBucketsLoader() {
  const client = createHonoClient<GetStorageBucketsRoute>();
  const response = await client['v1']['storage']['buckets'].$get();

  return handleHonoClientResponse(response);
}
