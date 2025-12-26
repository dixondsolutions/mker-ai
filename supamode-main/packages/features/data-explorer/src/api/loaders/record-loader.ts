import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { GetRecordRoute } from '../routes';

/**
 * @name recordLoader
 * @description Loader for fetching a single record with metadata and formatted foreign keys
 * @param params
 */
export async function recordLoader(params: {
  schema: string;
  table: string;
  keyValues: Record<string, unknown>;
}) {
  const client = createHonoClient<GetRecordRoute>();

  // Fetch the record data
  const response = await client['v1']['tables'][':schema'][':table'][
    'record'
  ].$get({
    param: {
      schema: params.schema,
      table: params.table,
    },
    query: params.keyValues,
  });

  return handleHonoClientResponse(response);
}
