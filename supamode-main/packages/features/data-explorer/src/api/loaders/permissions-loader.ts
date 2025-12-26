import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { GetDataRecordPermissionsRoute } from '../routes';

/**
 * @name dataRecordPermissionsLoader
 * @description Loader for fetching data record permissions
 * @param params
 */
export async function dataRecordPermissionsLoader(params: {
  schema: string;
  table: string;
}) {
  const client = createHonoClient<GetDataRecordPermissionsRoute>();

  // Fetch the roles
  const response = await client['v1']['data'][':schema'][':table'][
    'permissions'
  ].$get({
    param: {
      schema: params.schema,
      table: params.table,
    },
  });

  return handleHonoClientResponse(response);
}
