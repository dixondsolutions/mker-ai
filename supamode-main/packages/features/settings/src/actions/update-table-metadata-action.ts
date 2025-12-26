import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { UpdateTableMetadataRoute } from '../api/routes';
import { TableMetadataSchema, TableMetadataSchemaType } from '../api/schemas';

/**
 * Update table metadata action
 * @param params - The parameters for updating the table metadata
 * @returns The response from the API
 */
export async function updateTableMetadataRouterAction(
  params: {
    schema: string;
    table: string;
  } & {
    data: TableMetadataSchemaType;
  },
) {
  const client = createHonoClient<UpdateTableMetadataRoute>();
  const json = TableMetadataSchema.parse(params.data);

  const resource = client['v1']['tables'][':schema'][':table'];

  const response = await resource.$put({
    param: {
      schema: params.schema,
      table: params.table,
    },
    json,
  });

  return handleHonoClientResponse(response);
}
