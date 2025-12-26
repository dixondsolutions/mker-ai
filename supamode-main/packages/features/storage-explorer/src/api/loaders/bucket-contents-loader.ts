import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { GetBucketContentsRoute } from '../routes';

/**
 * Load bucket contents data
 * @param params - The parameters for the loader
 * @returns The response from the server
 */
export async function bucketContentsLoader(params: {
  bucket: string;
  path?: string;
}) {
  const client = createHonoClient<GetBucketContentsRoute>();

  const response = await client['v1']['storage']['buckets'][':bucket'][
    'contents'
  ].$get({
    param: { bucket: params.bucket },
    query: params.path ? { path: params.path } : {},
  });

  return handleHonoClientResponse(response);
}
