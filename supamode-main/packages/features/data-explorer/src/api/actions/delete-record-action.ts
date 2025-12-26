import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { DeleteRecordByConditionsRoute, DeleteRecordRoute } from '../routes';

/**
 * @description Delete a record
 * @param params
 */
export async function deleteRecordAction(params: {
  schema: string;
  table: string;
  id: string;
}) {
  const { schema, table, id } = params;
  const client = createHonoClient<DeleteRecordRoute>();

  const result = await client['v1']['tables'][':schema'][':table']['record'][
    ':id'
  ].$delete({
    param: { schema, table, id },
  });

  return handleHonoClientResponse(result);
}

/**
 * @description Delete a record by conditions
 * @param params
 */
export async function deleteRecordByConditionsAction(params: {
  schema: string;
  table: string;
  conditions: Record<string, unknown>;
}) {
  const { schema, table, conditions } = params;
  const client = createHonoClient<DeleteRecordByConditionsRoute>();

  const result = await client['v1']['tables'][':schema'][':table']['record'][
    'conditions'
  ].$delete({
    param: { schema, table },
    json: { conditions },
  });

  return handleHonoClientResponse(result);
}
