import { z } from 'zod';

import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { UpdateTableColumnsConfigRoute } from '../api/routes/update-table-columns-config';
import { UpdateTableColumnsConfigSchema } from '../api/schemas';

/**
 * Update the columns metadata for a table
 * @param params
 */
export async function updateTableColumnsMetadataAction(
  params: {
    schema: string;
    table: string;
  } & {
    data: z.infer<typeof UpdateTableColumnsConfigSchema>;
  },
) {
  const json = UpdateTableColumnsConfigSchema.parse(params.data);
  const client = createHonoClient<UpdateTableColumnsConfigRoute>();

  const resource = client['v1']['tables'][':schema'][':table']['columns'];

  const response = await resource.$put({
    param: {
      schema: params.schema,
      table: params.table,
    },
    json,
  });

  return handleHonoClientResponse(response);
}
