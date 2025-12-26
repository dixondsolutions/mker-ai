import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { BatchDeleteRecordsRoute } from '../routes';

/**
 * Batch delete records action
 * @param params - The parameters for the action
 * @returns The result of the action
 */
export async function batchDeleteRecordsAction(params: {
  schema: string;
  table: string;
  items: Array<Record<string, unknown>>;
}) {
  const { schema, table, items } = params;
  const client = createHonoClient<BatchDeleteRecordsRoute>();

  const result = await client['v1']['tables'][':schema'][':table'][
    'records'
  ].$delete({
    param: { schema, table },
    json: { items },
  });

  return handleHonoClientResponse(result);
}
