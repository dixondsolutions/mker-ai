import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { SyncManagedTablesRoute } from '../api/routes';
import type { SyncTablesSchemaType } from '../api/schemas';

export async function syncManagedTablesRouterAction(
  params: SyncTablesSchemaType,
) {
  const client = createHonoClient<SyncManagedTablesRoute>();

  const resource = client['v1']['tables']['sync'];

  const response = await resource.$post({ json: params });

  return handleHonoClientResponse(response);
}
