import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { UpdateRecordByConditionsRoute, UpdateRecordRoute } from '../routes';

/**
 * Update a record in the database
 * @param schema
 * @param table
 * @param id
 * @param data
 */
export async function updateRecordAction({
  schema,
  table,
  id,
  data,
}: {
  schema: string;
  table: string;
  id: string;
  data: Record<string, unknown>;
}) {
  const client = createHonoClient<UpdateRecordRoute>();

  const response = await client['v1']['tables'][':schema'][':table']['record'][
    ':id'
  ].$put({
    param: {
      schema,
      table,
      id,
    },
    json: data,
  });

  return handleHonoClientResponse(response);
}

/**
 * @description Update a record by conditions
 * @param params
 */
export async function updateRecordByConditionsAction(params: {
  schema: string;
  table: string;
  conditions: Record<string, unknown>;
  data: Record<string, unknown>;
}) {
  const { schema, table, conditions, data } = params;
  const client = createHonoClient<UpdateRecordByConditionsRoute>();

  const result = await client['v1']['tables'][':schema'][':table']['record'][
    'conditions'
  ].$put({
    param: { schema, table },
    json: { conditions, data },
  });

  return handleHonoClientResponse(result);
}
