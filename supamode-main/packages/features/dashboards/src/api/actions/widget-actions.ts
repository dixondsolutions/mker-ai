import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { WidgetType } from '../../types';
import type {
  CreateWidgetRoute,
  DeleteWidgetRoute,
  UpdateWidgetPositionsRoute,
  UpdateWidgetRoute,
} from '../routes/widgets-routes';

/**
 * Create a new widget
 */
export async function createWidgetAction(data: {
  dashboardId: string;
  widgetType: WidgetType;
  title: string;
  schemaName: string;
  tableName: string;
  config: Record<string, unknown>;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}) {
  const client = createHonoClient<CreateWidgetRoute>();

  const response = await client['v1']['widgets'].$post({
    json: data,
  });

  return await handleHonoClientResponse(response);
}

/**
 * Update an existing widget
 */
export async function updateWidgetAction({
  id,
  data,
}: {
  id: string;
  data: {
    widgetType?: WidgetType;
    title?: string;
    schemaName?: string;
    tableName?: string;
    config?: Record<string, unknown>;
    position?: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  };
}) {
  const client = createHonoClient<UpdateWidgetRoute>();

  const response = await client['v1']['widgets'][':id'].$put({
    param: { id },
    json: data,
  });

  return await handleHonoClientResponse(response);
}

/**
 * Delete a widget
 */
export async function deleteWidgetAction({ id }: { id: string }) {
  const client = createHonoClient<DeleteWidgetRoute>();

  const response = await client['v1']['widgets'][':id'].$delete({
    param: { id },
  });

  return await handleHonoClientResponse(response);
}

/**
 * Update multiple widget positions (for drag and drop)
 */
export async function updateWidgetPositionsAction({
  updates,
}: {
  updates: Array<{
    id: string;
    position: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }>;
}) {
  const client = createHonoClient<UpdateWidgetPositionsRoute>();

  const response = await client['v1']['widgets']['positions'].$put({
    json: { updates },
  });

  return await handleHonoClientResponse(response);
}
