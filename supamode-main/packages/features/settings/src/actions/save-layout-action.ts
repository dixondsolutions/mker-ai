import { createHonoClient } from '@kit/api';
import { getErrorMessage } from '@kit/shared/utils';
import { RecordLayoutConfig } from '@kit/types';

import { SaveLayoutRoute } from '../api/routes/save-layout-route';

interface SaveLayoutParams {
  schema: string;
  table: string;
  layout: RecordLayoutConfig | null;
}

export async function saveLayoutAction(params: SaveLayoutParams) {
  const client = createHonoClient<SaveLayoutRoute>();

  const response = await client['v1']['resources'][':schema'][':table'][
    'layout'
  ].$post({
    param: {
      schema: params.schema,
      table: params.table,
    },
    json: { layout: params.layout },
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(getErrorMessage(error) || 'Failed to save layout');
  }

  return response.json();
}
