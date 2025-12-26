import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { UpdateSavedViewRoute } from '../routes';
import { CreateSavedViewRoute } from '../routes';
import { DeleteSavedViewRoute } from '../routes';

/**
 * @name updateSavedViewAction
 * @description Update a saved view
 * @param params
 */
export async function updateSavedViewAction(params: {
  id: string;
  name?: string;
  description?: string;
  roles?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
  schema: string;
  table: string;
}) {
  const client = createHonoClient<UpdateSavedViewRoute>();

  const { name, description, roles, config, schema, table, id } = params;

  const response = await client['v1']['tables'][`:schema`][`:table`]['views'][
    `:id`
  ].$put({
    param: {
      schema,
      table,
      id,
    },
    json: {
      name,
      description,
      roles,
      config,
    },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name deleteSavedViewAction
 * @description Delete a saved view
 * @param params
 */
export async function deleteSavedViewAction(params: {
  viewId: string;
  schema: string;
  table: string;
}) {
  const client = createHonoClient<DeleteSavedViewRoute>();

  const { viewId, schema, table } = params;

  const response = await client['v1']['tables'][`:schema`][`:table`]['views'][
    ':id'
  ].$delete({
    param: {
      schema,
      table,
      id: viewId,
    },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name createSavedViewAction
 * @description Create a saved view
 * @param params
 */
export async function createSavedViewAction(params: {
  name: string;
  description: string;
  roles: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
  schema: string;
  table: string;
}) {
  const client = createHonoClient<CreateSavedViewRoute>();

  const { name, description, roles, config, schema, table } = params;

  const response = await client['v1']['tables'][`:schema`][`:table`][
    'views'
  ].$post({
    param: {
      schema,
      table,
    },
    json: {
      name,
      description,
      roles,
      config,
    },
  });

  return handleHonoClientResponse(response);
}
