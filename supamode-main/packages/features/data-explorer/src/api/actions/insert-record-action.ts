import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { InsertRecordRoute } from '../routes';

/**
 * @description Create a record
 * @param params
 */
export async function insertRecordAction(params: {
  schema: string;
  table: string;
  data: Record<string, unknown>;
}) {
  const { schema, table, data } = params;
  const client = createHonoClient<InsertRecordRoute>();

  const result = await client['v1']['tables'][':schema'][':table'][
    'record'
  ].$post({
    param: { schema, table },
    json: data,
  });

  return handleHonoClientResponse(result);
}
