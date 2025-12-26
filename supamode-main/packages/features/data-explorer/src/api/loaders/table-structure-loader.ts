import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { GetTableMetadataRoute } from '../routes';

/**
 * Loader for table metadata
 * @param params
 * @returns
 */
export async function tableMetadataLoader({
  schema,
  table,
}: {
  schema: string;
  table: string;
}) {
  const client = createHonoClient<GetTableMetadataRoute>();

  const response = await client['v1']['tables'][':schema'][':table'][
    'metadata'
  ].$get({
    param: {
      schema,
      table,
    },
  });

  return handleHonoClientResponse(response);
}
