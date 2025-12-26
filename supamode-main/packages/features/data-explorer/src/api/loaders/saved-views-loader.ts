import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { GetSavedViewsRoute } from '../routes';

/**
 * @name savedViewsLoader
 * @description Loader for fetching saved views for a specific schema and table
 * @param params
 */
export async function savedViewsLoader(params: {
  schema: string;
  table: string;
}) {
  const client = createHonoClient<GetSavedViewsRoute>();

  // Fetch the saved views
  const response = await client['v1']['tables'][`:schema`][`:table`][
    'views'
  ].$get({
    param: {
      schema: params.schema,
      table: params.table,
    },
  });

  return handleHonoClientResponse(response);
}
