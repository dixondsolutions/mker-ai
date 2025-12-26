import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { UpdateTablesMetadataRoute } from '../api/routes';
import {
  UpdateTablesMetadataSchema,
  UpdateTablesMetadataSchemaType,
} from '../api/schemas';

/**
 * Configure resource action
 * @param params - The parameters for configuring resources
 * @returns The response from the API
 */
export async function updateTablesMetadataRouterAction(
  params: UpdateTablesMetadataSchemaType,
) {
  const client = createHonoClient<UpdateTablesMetadataRoute>();
  const json = UpdateTablesMetadataSchema.parse(params);

  const resource = client['v1']['tables'];

  const response = await resource.$put({
    json,
  });

  return handleHonoClientResponse(response);
}
