import { createHonoClient } from '@kit/api';

import { GetGlobalSearchRoute } from '../api/routes';

/**
 * Load global search results across readable resources
 * @returns The global search results
 */
export async function globalSearchLoader(params: {
  query: string;
  offset?: number;
  limit?: number;
}) {
  const client = createHonoClient<GetGlobalSearchRoute>();

  const response = await client['v1']['resources']['search'].$get({
    query: {
      query: params.query,
      offset: params.offset?.toString(),
      limit: params.limit?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch global search results');
  }

  return response.json();
}
