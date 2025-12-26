import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type {
  GetBucketContentsRoute,
  GetStorageBucketsRoute,
} from './api/routes';

/**
 * Load storage buckets
 */
export async function storageBucketsLoader() {
  const client = createHonoClient<GetStorageBucketsRoute>();

  const response = await client['v1']['storage']['buckets'].$get();

  return handleHonoClientResponse(response);
}

/**
 * Load bucket contents
 */
export async function bucketContentsLoader(params: {
  bucket: string;
  path?: string;
  search?: string;
  page?: number;
}) {
  const client = createHonoClient<GetBucketContentsRoute>();

  const queryParams: {
    path?: string;
    search?: string;
    page?: string;
    limit?: string;
  } = {};
  if (params.path) {
    queryParams.path = params.path;
  }

  if (params.search) {
    queryParams.search = params.search;
  }

  if (params.page) {
    queryParams.page = params.page.toString();
  }

  // Use a default limit of 25 items per page
  queryParams.limit = '25';

  const response = await client['v1']['storage']['buckets'][':bucket'][
    'contents'
  ].$get({
    param: {
      bucket: params.bucket,
    },
    query: queryParams,
  });

  return handleHonoClientResponse(response);
}
